import prisma from '../config/prisma.js';
import { AppError } from '../middleware/error.middleware.js';

export const createGroup = async (name, createdBy) => {
  const group = await prisma.group.create({
    data: {
      name,
      createdBy,
      members: {
        create: { userId: createdBy, role: 'ADMIN' },
      },
    },
    include: {
      members: { include: { user: { select: { id: true, name: true, email: true } } } },
    },
  });
  return group;
};

export const getUserGroups = async (userId) => {
  const memberships = await prisma.groupMember.findMany({
    where: { userId },
    include: {
      group: {
        include: {
          members: {
            include: { user: { select: { id: true, name: true, email: true } } },
          },
        },
      },
    },
  });
  return memberships.map((m) => m.group);
};

export const getGroupById = async (groupId, userId) => {
  await assertMembership(groupId, userId);
  return prisma.group.findUnique({
    where: { id: groupId },
    include: {
      members: {
        include: { user: { select: { id: true, name: true, email: true } } },
      },
      expenses: {
        orderBy: { createdAt: 'desc' },
        include: {
          createdBy: { select: { id: true, name: true } },
          paidBy: { select: { id: true, name: true } },
          splits: { include: { user: { select: { id: true, name: true } } } },
          tags: { include: { tag: true } },
        },
      },
    },
  });
};

export const addMember = async (groupId, adminId, email) => {
  await assertAdmin(groupId, adminId);

  const targetUser = await prisma.user.findUnique({ where: { email } });
  if (!targetUser) throw new AppError('User not found.', 404);

  const existing = await prisma.groupMember.findUnique({
    where: { groupId_userId: { groupId, userId: targetUser.id } },
  });
  if (existing) throw new AppError('User is already a member of this group.', 400);

  return prisma.groupMember.create({
    data: { groupId, userId: targetUser.id, role: 'MEMBER' },
    include: { user: { select: { id: true, name: true, email: true } } },
  });
};

export const removeMember = async (groupId, adminId, targetUserId) => {
  await assertAdmin(groupId, adminId);

  if (adminId === targetUserId) {
    throw new AppError('Use the leave endpoint to leave the group.', 400);
  }

  const membership = await prisma.groupMember.findUnique({
    where: { groupId_userId: { groupId, userId: targetUserId } },
  });
  if (!membership) throw new AppError('User is not a member of this group.', 404);

  // Block removal if user has outstanding balances
  const { getUserBalanceInGroup } = await import('./balance.service.js');
  const balance = await getUserBalanceInGroup(targetUserId, groupId);
  if (balance !== 0) {
    throw new AppError(
      'Cannot remove member with outstanding balance. Settle all balances first.',
      400
    );
  }

  return prisma.groupMember.delete({
    where: { groupId_userId: { groupId, userId: targetUserId } },
  });
};

export const transferAdmin = async (groupId, currentAdminId, newAdminId) => {
  await assertAdmin(groupId, currentAdminId);

  const newAdminMembership = await prisma.groupMember.findUnique({
    where: { groupId_userId: { groupId, userId: newAdminId } },
  });
  if (!newAdminMembership) throw new AppError('Target user is not in this group.', 404);

  await prisma.$transaction([
    prisma.groupMember.update({
      where: { groupId_userId: { groupId, userId: currentAdminId } },
      data: { role: 'MEMBER' },
    }),
    prisma.groupMember.update({
      where: { groupId_userId: { groupId, userId: newAdminId } },
      data: { role: 'ADMIN' },
    }),
  ]);

  return { message: 'Admin role transferred successfully.' };
};

export const leaveGroup = async (groupId, userId) => {
  await assertMembership(groupId, userId);

  const members = await prisma.groupMember.findMany({ where: { groupId } });

  if (members.length === 1) {
    throw new AppError(
      'You cannot leave the group because you are the only member. Delete the group instead.',
      400
    );
  }

  const myMembership = members.find((m) => m.userId === userId);
  if (myMembership.role === 'ADMIN') {
    const otherAdmins = members.filter(
      (m) => m.role === 'ADMIN' && m.userId !== userId
    );
    if (otherAdmins.length === 0) {
      throw new AppError(
        'Transfer admin role to another member before leaving the group.',
        400
      );
    }
  }

  const { getUserBalanceInGroup } = await import('./balance.service.js');
  const balance = await getUserBalanceInGroup(userId, groupId);
  if (balance !== 0) {
    throw new AppError(
      'Please settle all outstanding balances before leaving the group.',
      400
    );
  }

  return prisma.groupMember.delete({
    where: { groupId_userId: { groupId, userId } },
  });
};

export const deleteGroup = async (groupId, userId) => {
  await assertAdmin(groupId, userId);

  // Check all member balances
  const members = await prisma.groupMember.findMany({ where: { groupId } });
  const { getUserBalanceInGroup } = await import('./balance.service.js');

  for (const { userId: memberId } of members) {
    const balance = await getUserBalanceInGroup(memberId, groupId);
    if (balance !== 0) {
      throw new AppError(
        'All balances must be settled before deleting the group.',
        400
      );
    }
  }

  return prisma.group.delete({ where: { id: groupId } });
};

// ── Helpers ──────────────────────────────────────────────────────────────────

export const assertMembership = async (groupId, userId, date = null) => {
  const membership = await prisma.groupMember.findUnique({
    where: { groupId_userId: { groupId, userId } },
  });
  if (!membership) throw new AppError('You are not a member of this group.', 403);
  
  if (date) {
    const d = new Date(date);
    if (membership.joinedAt && d < membership.joinedAt) {
      throw new AppError('User was not in the group on this date.', 403);
    }
    if (membership.leftAt && d > membership.leftAt) {
      throw new AppError('User was not in the group on this date.', 403);
    }
  }
  return membership;
};

export const assertAdmin = async (groupId, userId) => {
  const membership = await assertMembership(groupId, userId);
  if (membership.role !== 'ADMIN') {
    throw new AppError('Only group admins can perform this action.', 403);
  }
  return membership;
};

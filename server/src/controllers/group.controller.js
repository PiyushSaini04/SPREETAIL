import * as groupService from '../services/group.service.js';

export const createGroup = async (req, res, next) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ success: false, message: 'Group name is required.', statusCode: 400 });
    const group = await groupService.createGroup(name, req.user.id);
    return res.status(201).json({ success: true, data: group });
  } catch (err) { next(err); }
};

export const getUserGroups = async (req, res, next) => {
  try {
    const groups = await groupService.getUserGroups(req.user.id);
    return res.status(200).json({ success: true, data: groups });
  } catch (err) { next(err); }
};

export const getGroupById = async (req, res, next) => {
  try {
    const group = await groupService.getGroupById(req.params.groupId, req.user.id);
    return res.status(200).json({ success: true, data: group });
  } catch (err) { next(err); }
};

export const addMember = async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ success: false, message: 'User email is required.', statusCode: 400 });
    const member = await groupService.addMember(req.params.groupId, req.user.id, email);
    return res.status(201).json({ success: true, data: member });
  } catch (err) { next(err); }
};

export const removeMember = async (req, res, next) => {
  try {
    await groupService.removeMember(req.params.groupId, req.user.id, req.params.userId);
    return res.status(200).json({ success: true, data: { message: 'Member removed successfully.' } });
  } catch (err) { next(err); }
};

export const transferAdmin = async (req, res, next) => {
  try {
    const { newAdminId } = req.body;
    if (!newAdminId) return res.status(400).json({ success: false, message: 'newAdminId is required.', statusCode: 400 });
    const result = await groupService.transferAdmin(req.params.groupId, req.user.id, newAdminId);
    return res.status(200).json({ success: true, data: result });
  } catch (err) { next(err); }
};

export const leaveGroup = async (req, res, next) => {
  try {
    await groupService.leaveGroup(req.params.groupId, req.user.id);
    return res.status(200).json({ success: true, data: { message: 'Left group successfully.' } });
  } catch (err) { next(err); }
};

export const deleteGroup = async (req, res, next) => {
  try {
    await groupService.deleteGroup(req.params.groupId, req.user.id);
    return res.status(200).json({ success: true, data: { message: 'Group deleted successfully.' } });
  } catch (err) { next(err); }
};

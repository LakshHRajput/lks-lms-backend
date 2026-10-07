import type { Response } from "express";

import type { AuthenticatedRequest } from "../middlewares/auth.middleware.js";
import {
  createNote,
  deleteNote,
  getNoteById,
  listNotes,
  updateNote
} from "../services/note.service.js";
import {
  createNoteSchema,
  noteListQuerySchema,
  updateNoteSchema
} from "../validations/note.validation.js";

export const getNotes = async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: "Authentication required"
    });
  }

  const query = noteListQuerySchema.parse(req.query);
  const result = await listNotes(req.user, query);

  return res.status(200).json({
    success: true,
    message: "Notes fetched successfully",
    data: result.data,
    pagination: result.pagination
  });
};

export const getNote = async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: "Authentication required"
    });
  }

  const noteId = Number(req.params.id);
  const note = await getNoteById(req.user, noteId);

  return res.status(200).json({
    success: true,
    message: "Note fetched successfully",
    data: note
  });
};

export const createNewNote = async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: "Authentication required"
    });
  }

  const input = createNoteSchema.parse(req.body);
  const note = await createNote(req.user, input);

  return res.status(201).json({
    success: true,
    message: "Note created successfully",
    data: note
  });
};

export const updateNoteById = async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: "Authentication required"
    });
  }

  const noteId = Number(req.params.id);
  const input = updateNoteSchema.parse(req.body);
  const note = await updateNote(req.user, noteId, input);

  return res.status(200).json({
    success: true,
    message: "Note updated successfully",
    data: note
  });
};

export const deleteNoteById = async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: "Authentication required"
    });
  }

  const noteId = Number(req.params.id);
  const result = await deleteNote(req.user, noteId);

  return res.status(200).json({
    success: true,
    message: result.message
  });
};

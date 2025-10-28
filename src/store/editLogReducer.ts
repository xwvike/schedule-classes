import { createSlice, type PayloadAction } from '@reduxjs/toolkit'

interface ScheduleSnapshot {
  projectId: string
  scheduleId: string
  startDate: number
  endDate: number
  description: string
  teacherId: string
  area: string
}

type Operation = 'add' | 'update' | 'delete'

interface LogEntry {
  time: number
  op: Operation
  projectId: string
  scheduleId: string
  before?: ScheduleSnapshot
  after?: ScheduleSnapshot
}

interface EditLogState {
  log: LogEntry[]
  cursor: number
}

const initialState: EditLogState = {
  log: [],
  cursor: 0,
}

export const editLogSlice = createSlice({
  name: 'editLog',
  initialState,
  reducers: {
    addLogEntry: (state, action: PayloadAction<LogEntry>) => {
      if (state.cursor < state.log.length) {
        state.log = state.log.slice(0, state.cursor)
      }
      state.log.push(action.payload)
      state.cursor = state.log.length
    },
    recordAdd: (state, action: PayloadAction<ScheduleSnapshot>) => {
      const after = action.payload
      const entry: LogEntry = {
        time: Date.now(),
        op: 'add',
        projectId: after.projectId,
        scheduleId: after.scheduleId,
        after,
      }
      if (state.cursor < state.log.length) {
        state.log = state.log.slice(0, state.cursor)
      }
      state.log.push(entry)
      state.cursor = state.log.length
    },
    recordUpdate: (
      state,
      action: PayloadAction<{
        before: ScheduleSnapshot
        after: ScheduleSnapshot
      }>
    ) => {
      const { before, after } = action.payload
      const entry: LogEntry = {
        time: Date.now(),
        op: 'update',
        projectId: after.projectId,
        scheduleId: after.scheduleId,
        before,
        after,
      }
      if (state.cursor < state.log.length) {
        state.log = state.log.slice(0, state.cursor)
      }
      state.log.push(entry)
      state.cursor = state.log.length
    },
    recordDelete: (state, action: PayloadAction<ScheduleSnapshot>) => {
      const before = action.payload
      const entry: LogEntry = {
        time: Date.now(),
        op: 'delete',
        projectId: before.projectId,
        scheduleId: before.scheduleId,
        before,
      }
      if (state.cursor < state.log.length) {
        state.log = state.log.slice(0, state.cursor)
      }
      state.log.push(entry)
      state.cursor = state.log.length
    },
    undo: (state) => {
      if (state.cursor > 0) {
        state.cursor -= 1
      }
    },
    redo: (state) => {
      if (state.cursor < state.log.length) {
        state.cursor += 1
      }
    },
    cleanLog: (state) => {
      state.log = []
      state.cursor = 0
    },
  },
})

export const {
  addLogEntry,
  recordAdd,
  recordUpdate,
  recordDelete,
  undo,
  redo,
  cleanLog,
} = editLogSlice.actions

// state-scoped selectors
export const canUndo = (state: EditLogState): boolean => state.cursor > 0
export const canRedo = (state: EditLogState): boolean =>
  state.cursor < state.log.length
export const getUndoEntry = (state: EditLogState): LogEntry | undefined =>
  state.cursor > 0 ? state.log[state.cursor - 1] : undefined
export const getRedoEntry = (state: EditLogState): LogEntry | undefined =>
  state.cursor < state.log.length ? state.log[state.cursor] : undefined

// root-state selectors (assumes slice key 'editLog')
export const selectCanUndo = (state: unknown): boolean =>
  canUndo((state as { editLog: EditLogState }).editLog)
export const selectCanRedo = (state: unknown): boolean =>
  canRedo((state as { editLog: EditLogState }).editLog)
export const selectNextUndoEntry = (state: unknown): LogEntry | undefined =>
  getUndoEntry((state as { editLog: EditLogState }).editLog)
export const selectNextRedoEntry = (state: unknown): LogEntry | undefined =>
  getRedoEntry((state as { editLog: EditLogState }).editLog)

export default editLogSlice.reducer

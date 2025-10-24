import { createSlice, type PayloadAction } from '@reduxjs/toolkit'

interface LogEntry {
  time: number
  action: string
  data: unknown
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
      const { payload } = action
      state.log.push(payload)
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

export const { addLogEntry, undo, redo, cleanLog } = editLogSlice.actions

// state-scoped selectors
export const canUndo = (state: EditLogState): boolean => state.cursor > 0
export const canRedo = (state: EditLogState): boolean =>
  state.cursor < state.log.length

// root-state selectors (assumes slice key 'editLog')
export const selectCanUndo = (state: unknown): boolean =>
  canUndo((state as { editLog: EditLogState }).editLog)
export const selectCanRedo = (state: unknown): boolean =>
  canRedo((state as { editLog: EditLogState }).editLog)

export default editLogSlice.reducer

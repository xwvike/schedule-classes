import { createSlice, type PayloadAction, nanoid } from '@reduxjs/toolkit'

interface baseEntry {
  projectId: string
  startDate: Date | number
  endDate: Date | number
  description: string
  teacherId: string
  subjectsId: string
  area: string
}

interface scheduleEntry extends baseEntry {
  scheduleId: string
}

// 单条排课项（在 state 中改为时间戳，确保可序列化）
type ScheduleItem = Omit<baseEntry, 'startDate' | 'endDate'> & {
  scheduleId: string
  startDate: number
  endDate: number
}

// projectId -> 该项目下的排课数组
type ScheduleData = Record<string, ScheduleItem[]>

interface EditDataState {
  scheduleData: ScheduleData
}

const initialState: EditDataState = {
  scheduleData: {},
}

const editDataSlice = createSlice({
  name: 'editData',
  initialState,
  reducers: {
    addSchedule: {
      prepare: (payload: baseEntry) => {
        const scheduleId = nanoid()
        return {
          payload: {
            projectId: payload.projectId,
            startDate: Number(new Date(payload.startDate)),
            endDate: Number(new Date(payload.endDate)),
            description: payload.description,
            teacherId: payload.teacherId,
            subjectsId: payload.subjectsId,
            area: payload.area,
            scheduleId,
          } as ScheduleItem,
        }
      },
      reducer: (state, action: PayloadAction<ScheduleItem>) => {
        const { projectId } = action.payload
        if (!state.scheduleData[projectId]) {
          state.scheduleData[projectId] = [action.payload]
        } else {
          state.scheduleData[projectId] = [
            ...state.scheduleData[projectId],
            action.payload,
          ]
        }
      },
    },
    addScheduleRaw: {
      prepare: (payload: ScheduleItem) => {
        return {
          payload: {
            ...payload,
            startDate: Number(new Date(payload.startDate)),
            endDate: Number(new Date(payload.endDate)),
          } as ScheduleItem,
        }
      },
      reducer: (state, action: PayloadAction<ScheduleItem>) => {
        const { projectId } = action.payload
        if (!state.scheduleData[projectId]) {
          state.scheduleData[projectId] = [action.payload]
        } else {
          state.scheduleData[projectId] = [
            ...state.scheduleData[projectId],
            action.payload,
          ]
        }
      },
    },
    updateSchedule: {
      prepare: (payload: scheduleEntry) => {
        return {
          payload: {
            projectId: payload.projectId,
            startDate: Number(new Date(payload.startDate)),
            endDate: Number(new Date(payload.endDate)),
            description: payload.description,
            teacherId: payload.teacherId,
            area: payload.area,
            scheduleId: payload.scheduleId,
            subjectsId: payload.subjectsId,
          } as ScheduleItem,
        }
      },
      reducer: (state, action: PayloadAction<ScheduleItem>) => {
        const { projectId, scheduleId } = action.payload
        if (!state.scheduleData[projectId]) {
          state.scheduleData[projectId] = [action.payload]
        } else {
          state.scheduleData[projectId] = state.scheduleData[projectId].map(
            (entry) =>
              entry.scheduleId === scheduleId ? action.payload : entry
          )
        }
      },
    },
    deleteSchedule: {
      prepare: (payload: scheduleEntry) => ({
        payload: {
          projectId: payload.projectId,
          scheduleId: payload.scheduleId,
        },
      }),
      reducer: (
        state,
        action: PayloadAction<{ projectId: string; scheduleId: string }>
      ) => {
        const { projectId, scheduleId } = action.payload
        if (!state.scheduleData[projectId]) {
          return
        }
        state.scheduleData[projectId] = state.scheduleData[projectId].filter(
          (entry) => entry.scheduleId !== scheduleId
        )
      },
    },
    loadNewSchedule: (state, action: PayloadAction<ScheduleData>) => {
      state.scheduleData = action.payload
    },
  },
})

export const {
  addSchedule,
  addScheduleRaw,
  updateSchedule,
  deleteSchedule,
  loadNewSchedule,
} = editDataSlice.actions
export default editDataSlice.reducer

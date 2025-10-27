import { configureStore } from '@reduxjs/toolkit'
import editLogReducer from './editLogReducer'
import editDataReducer from './editDataReducer'
import projectsReducer from './projectsReducer'
import teachersReducer from './teachersReducer'

const store = configureStore({
  reducer: {
    editLog: editLogReducer,
    editData: editDataReducer,
    projects: projectsReducer,
    teachers: teachersReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [
          'editData/addSchedule',
          'editData/updateSchedule',
          'editData/deleteSchedule',
        ],
        ignoredActionPaths: ['payload.startDate', 'payload.endDate'],
        ignoredPaths: ['editData.scheduleData'],
      },
    }),
})

export default store

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch

import { configureStore } from '@reduxjs/toolkit'
import editLogReducer from './editLogReducer'

const store = configureStore({
  reducer: {
    editLog: editLogReducer,
  },
})

export default store

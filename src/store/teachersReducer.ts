import { createSlice, type PayloadAction } from '@reduxjs/toolkit'

interface Teacher {
  avatar: string
  name: string
  location: string
  phone: string
  id: string
  subject: string
}

const initialState = {
  teachers: [] as Teacher[],
}

const teachersSlice = createSlice({
  name: 'teachers',
  initialState,
  reducers: {
    loadTeachers: (state, action: PayloadAction<Teacher[]>) => {
      state.teachers = action.payload
    },
  },
})

export const { loadTeachers } = teachersSlice.actions
export default teachersSlice.reducer

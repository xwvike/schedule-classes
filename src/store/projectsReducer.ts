import { createSlice, type PayloadAction } from '@reduxjs/toolkit'

export type Project = {
  id: string
  name: string
  schoolId: string
  schoolName: string
  description: string
}

const initialState = {
  projects: [] as Project[],
}

const projectsSlice = createSlice({
  name: 'projects',
  initialState,
  reducers: {
    loadProjects(state, action: PayloadAction<Project[]>) {
      console.log(action.payload)
      state.projects = action.payload
    },
  },
})

export const { loadProjects } = projectsSlice.actions
export default projectsSlice.reducer

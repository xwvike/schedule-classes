import { createSlice, type PayloadAction } from '@reduxjs/toolkit'

interface Project {
  id: string
  name: string
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
      state.projects = action.payload
    },
  },
})

export const { loadProjects } = projectsSlice.actions
export default projectsSlice.reducer

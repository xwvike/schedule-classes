import { createSlice, type PayloadAction } from '@reduxjs/toolkit'

interface Project {
  id: string
  name: string
  description: string
}

const initialState = {
  allProjects: [] as Project[],
  projects: [] as Project[],
}

const projectsSlice = createSlice({
  name: 'projects',
  initialState,
  reducers: {
    loadProjects(state, action: PayloadAction<Project[]>) {
      state.allProjects = action.payload
      state.projects = action.payload
    },
    setActiveProjectsByIds(state, action: PayloadAction<string[]>) {
      const ids = new Set(action.payload)
      state.projects = state.allProjects.filter((p) => ids.has(p.id))
    },
  },
})

export const { loadProjects, setActiveProjectsByIds } = projectsSlice.actions
export default projectsSlice.reducer

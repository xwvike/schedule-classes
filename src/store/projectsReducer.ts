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
    addProject(state, action: PayloadAction<Project>) {
      state.projects.push(action.payload)
    },
    removeProject(state, action: PayloadAction<string>) {
      state.projects = state.projects.filter(
        (project) => project.id !== action.payload
      )
    },
    updateProject(state, action: PayloadAction<Project>) {
      const index = state.projects.findIndex(
        (project) => project.id === action.payload.id
      )
      if (index !== -1) {
        state.projects[index] = action.payload
      }
    },
  },
})

export const { loadProjects, addProject, removeProject, updateProject } =
  projectsSlice.actions
export default projectsSlice.reducer

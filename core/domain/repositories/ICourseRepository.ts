import { Course } from '../entities/course/Course'

export interface ICourseRepository {
  save(course: Course): Promise<void>
  update(course: Course): Promise<void>
  findById(id: string): Promise<Course | null>
  findAll(): Promise<Course[]>
  nextCorrelativo(): Promise<string>
}

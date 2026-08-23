export interface Position {
  id: number
  department_id: number
  position_code: string
  position_name: string
  allowance: string
  description: string | null
  is_active: boolean
  created_at: string
  updated_at: string
  deleted_at: string | null
}

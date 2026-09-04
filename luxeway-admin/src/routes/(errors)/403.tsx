import z from 'zod'
import { createFileRoute } from '@tanstack/react-router'
import { ForbiddenError } from '@/features/errors/forbidden'

const errorSearchSchema = z.object({
  message: z.string().optional().catch(''),
})

export const Route = createFileRoute('/(errors)/403')({
  validateSearch: errorSearchSchema,
  component: ForbiddenError,
})

import type { AppErrorCode } from './types'

export class AppError extends Error {
  readonly code: AppErrorCode
  readonly line?: number

  constructor(code: AppErrorCode, message: string, line?: number) {
    super(message)
    this.name = 'AppError'
    this.code = code
    this.line = line
  }
}

export class ValidationError extends AppError {
  constructor(message: string) {
    super('VALIDATION', message)
    this.name = 'ValidationError'
  }
}

export class NotFoundError extends AppError {
  constructor(id: string) {
    super('NOT_FOUND', `Todo not found: ${id}`)
    this.name = 'NotFoundError'
  }
}

export class ParseError extends AppError {
  constructor(message: string, line?: number) {
    super('PARSE', message, line)
    this.name = 'ParseError'
  }
}

export class DuplicateIdError extends AppError {
  constructor(id: string, line?: number) {
    super(
      'DUPLICATE_ID',
      `Duplicate todo id "${id}". Remove or rename the duplicate entry in todos.md, then reopen the file.`,
      line
    )
    this.name = 'DuplicateIdError'
  }
}

export function toAppErrorPayload(error: unknown): {
  code: AppErrorCode
  message: string
  line?: number
} {
  if (error instanceof AppError) {
    return { code: error.code, message: error.message, line: error.line }
  }
  if (error instanceof Error) {
    return { code: 'UNKNOWN', message: error.message }
  }
  return { code: 'UNKNOWN', message: 'Unknown error' }
}

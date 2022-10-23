export default interface Response {
  status: 'ok' | 'fail',
  message?: string,
  data?: object,
  error?: {
    error_message: string,
    error_code: string | number
  }
}
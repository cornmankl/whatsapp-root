// Vercel-compatible error handler middleware
// Import from the main error handler to maintain consistency
export { 
  errorHandler,
  asyncHandler,
  ValidationError,
  UnauthorizedError,
  NotFoundError,
  AppError
} from '../../middleware/errorHandler.js';


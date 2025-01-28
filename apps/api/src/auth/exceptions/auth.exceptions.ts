import { HttpException, HttpStatus } from '@nestjs/common';

export class TwitterAuthenticationException extends HttpException {
  constructor(message: string = 'Twitter authentication failed') {
    super(message, HttpStatus.UNAUTHORIZED);
  }
}

export class InvalidTokenException extends HttpException {
  constructor(message: string = 'Invalid or expired token') {
    super(message, HttpStatus.UNAUTHORIZED);
  }
}

export class UserNotFoundException extends HttpException {
  constructor(message: string = 'User not found') {
    super(message, HttpStatus.NOT_FOUND);
  }
}

export class TwitterTokenUpdateException extends HttpException {
  constructor(message: string = 'Failed to update Twitter tokens') {
    super(message, HttpStatus.INTERNAL_SERVER_ERROR);
  }
}

export class ConfigurationException extends HttpException {
  constructor(message: string = 'Authentication configuration error') {
    super(message, HttpStatus.INTERNAL_SERVER_ERROR);
  }
}

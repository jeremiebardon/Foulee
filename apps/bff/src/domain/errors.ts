/** An Activity (or one of its measures) breaks a domain invariant. */
export class InvalidActivityError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidActivityError';
  }
}

/**
 * Garmin refused our access: the Personal API Key is invalid or has expired
 * (ADR 0007). The runner has to create a new one.
 */
export class GarminAccessExpiredError extends Error {
  constructor(message = 'Garmin access has expired: create a new Personal API Key') {
    super(message);
    this.name = 'GarminAccessExpiredError';
  }
}

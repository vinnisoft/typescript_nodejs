export const errorMessages = (fieldName: string, type?: string) => {
  if (type === 'email') {
    return `${fieldName} must be a valid email.`;
  } else if (type === 'confirmPassword') {
    return `${fieldName} do not match`;
  } else if (type === 'password') {
    return `Invalid ${fieldName} criteria.`;
  } else {
    return `${fieldName} is required.`;
  }
};

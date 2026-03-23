export { loginSchema, registerSchema, registerFormSchema } from "./schemas/auth-schema"
export type { LoginInput, RegisterInput, RegisterFormValues } from "./schemas/auth-schema"
export type { AuthUser, AuthResponse } from "./types/auth-type"
export { useLogin, useRegister, useLogout, useGetAuthMe, useVerifyCode, useResendCode, useOjsRegister } from "./api"

// Multi-step registration
export {
  personalInfoSchema,
  academicInfoSchema,
  roleSelectionSchema,
  policyAgreementsSchema,
  registrationPayloadSchema,
  VALID_ROLES,
  REGISTRATION_STEPS,
} from "./schemas/registration-schemas"
export type {
  PersonalInfoValues,
  AcademicInfoValues,
  RoleSelectionValues,
  PolicyAgreementsValues,
  RegistrationPayload,
  RegistrationStepId,
  UserRole,
} from "./schemas/registration-schemas"
export { useRegistrationStore } from "./stores/registration-store"

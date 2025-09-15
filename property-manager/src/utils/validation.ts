import { z } from 'zod';

// Common validation schemas
export const emailSchema = z.string().email('Neteisingas el. pašto formatas');
export const phoneSchema = z.string().regex(/^\+?[1-9]\d{1,14}$/, 'Neteisingas telefono numeris');
export const passwordSchema = z.string().min(8, 'Slaptažodis turi būti bent 8 simbolių');

// User validation schemas
export const userRegistrationSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  firstName: z.string().min(2, 'Vardas turi būti bent 2 simbolių'),
  lastName: z.string().min(2, 'Pavardė turi būti bent 2 simbolių'),
  phone: phoneSchema.optional(),
});

export const userLoginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Slaptažodis yra privalomas'),
});

// Property validation schemas
export const propertySchema = z.object({
  address: z.string().min(5, 'Adresas turi būti bent 5 simbolių'),
  apartmentNumber: z.string().min(1, 'Buto numeris yra privalomas'),
  rent: z.number().positive('Nuomos kaina turi būti teigiama'),
  area: z.number().positive('Plotas turi būti teigiamas').optional(),
  rooms: z.number().int().positive('Kambarių skaičius turi būti teigiamas').optional(),
});

// Meter validation schemas
export const meterReadingSchema = z.object({
  currentReading: z.number().nonnegative('Rodmuo negali būti neigiamas'),
  readingDate: z.string().min(1, 'Rodmenų data yra privaloma'),
  photo: z.string().optional(),
});

// Utility functions
export function validateInput<T>(schema: z.ZodSchema<T>, data: unknown): {
  success: boolean;
  data?: T;
  errors?: string[];
} {
  try {
    const result = schema.parse(data);
    return { success: true, data: result };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        errors: error.errors.map(err => err.message),
      };
    }
    return {
      success: false,
      errors: ['Neteisingi duomenys'],
    };
  }
}

// Sanitization functions - Enhanced XSS protection
export function sanitizeString(input: string): string {
  return input
    .trim()
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+=/gi, '') // Remove event handlers
    .replace(/data:/gi, '') // Remove data: protocol
    .replace(/vbscript:/gi, '') // Remove vbscript: protocol
    .replace(/expression\(/gi, '') // Remove CSS expressions
    .replace(/url\(/gi, '') // Remove CSS url() functions
    .replace(/@import/gi, '') // Remove CSS imports
    .replace(/<script/gi, '') // Remove script tags
    .replace(/<\/script>/gi, '') // Remove closing script tags
    .replace(/<iframe/gi, '') // Remove iframe tags
    .replace(/<object/gi, '') // Remove object tags
    .replace(/<embed/gi, '') // Remove embed tags
    .replace(/<link/gi, '') // Remove link tags
    .replace(/<meta/gi, '') // Remove meta tags
    .replace(/<style/gi, '') // Remove style tags
    .replace(/<form/gi, '') // Remove form tags
    .replace(/<input/gi, '') // Remove input tags
    .replace(/<textarea/gi, '') // Remove textarea tags
    .replace(/<select/gi, '') // Remove select tags
    .replace(/<button/gi, '') // Remove button tags
    .replace(/<a\s+href/gi, '') // Remove anchor tags with href
    .replace(/<img/gi, '') // Remove img tags
    .replace(/<svg/gi, '') // Remove svg tags
    .replace(/<math/gi, '') // Remove math tags
    .replace(/<applet/gi, '') // Remove applet tags
    .replace(/<base/gi, '') // Remove base tags
    .replace(/<body/gi, '') // Remove body tags
    .replace(/<head/gi, '') // Remove head tags
    .replace(/<html/gi, '') // Remove html tags
    .replace(/<title/gi, '') // Remove title tags
    .replace(/<frameset/gi, '') // Remove frameset tags
    .replace(/<frame/gi, '') // Remove frame tags
    .replace(/<noframes/gi, '') // Remove noframes tags
    .replace(/<noscript/gi, '') // Remove noscript tags
    .replace(/<template/gi, '') // Remove template tags
    .replace(/<video/gi, '') // Remove video tags
    .replace(/<audio/gi, '') // Remove audio tags
    .replace(/<source/gi, '') // Remove source tags
    .replace(/<track/gi, '') // Remove track tags
    .replace(/<canvas/gi, '') // Remove canvas tags
    .replace(/<map/gi, '') // Remove map tags
    .replace(/<area/gi, '') // Remove area tags
    .replace(/<details/gi, '') // Remove details tags
    .replace(/<summary/gi, '') // Remove summary tags
    .replace(/<dialog/gi, '') // Remove dialog tags
    .replace(/<menu/gi, '') // Remove menu tags
    .replace(/<menuitem/gi, '') // Remove menuitem tags
    .replace(/<meter/gi, '') // Remove meter tags
    .replace(/<progress/gi, '') // Remove progress tags
    .replace(/<output/gi, '') // Remove output tags
    .replace(/<fieldset/gi, '') // Remove fieldset tags
    .replace(/<legend/gi, '') // Remove legend tags
    .replace(/<optgroup/gi, '') // Remove optgroup tags
    .replace(/<option/gi, '') // Remove option tags
    .replace(/<datalist/gi, '') // Remove datalist tags
    .replace(/<keygen/gi, '') // Remove keygen tags
    .replace(/<command/gi, '') // Remove command tags
    .replace(/<param/gi, '') // Remove param tags
    .replace(/<wbr/gi, '') // Remove wbr tags
    .replace(/<br/gi, '') // Remove br tags
    .replace(/<hr/gi, '') // Remove hr tags
    .replace(/<div/gi, '') // Remove div tags
    .replace(/<span/gi, '') // Remove span tags
    .replace(/<p/gi, '') // Remove p tags
    .replace(/<h[1-6]/gi, '') // Remove heading tags
    .replace(/<ul/gi, '') // Remove ul tags
    .replace(/<ol/gi, '') // Remove ol tags
    .replace(/<li/gi, '') // Remove li tags
    .replace(/<dl/gi, '') // Remove dl tags
    .replace(/<dt/gi, '') // Remove dt tags
    .replace(/<dd/gi, '') // Remove dd tags
    .replace(/<table/gi, '') // Remove table tags
    .replace(/<tr/gi, '') // Remove tr tags
    .replace(/<td/gi, '') // Remove td tags
    .replace(/<th/gi, '') // Remove th tags
    .replace(/<thead/gi, '') // Remove thead tags
    .replace(/<tbody/gi, '') // Remove tbody tags
    .replace(/<tfoot/gi, '') // Remove tfoot tags
    .replace(/<caption/gi, '') // Remove caption tags
    .replace(/<col/gi, '') // Remove col tags
    .replace(/<colgroup/gi, '') // Remove colgroup tags
    .replace(/<pre/gi, '') // Remove pre tags
    .replace(/<code/gi, '') // Remove code tags
    .replace(/<kbd/gi, '') // Remove kbd tags
    .replace(/<samp/gi, '') // Remove samp tags
    .replace(/<var/gi, '') // Remove var tags
    .replace(/<strong/gi, '') // Remove strong tags
    .replace(/<b/gi, '') // Remove b tags
    .replace(/<em/gi, '') // Remove em tags
    .replace(/<i/gi, '') // Remove i tags
    .replace(/<u/gi, '') // Remove u tags
    .replace(/<s/gi, '') // Remove s tags
    .replace(/<strike/gi, '') // Remove strike tags
    .replace(/<del/gi, '') // Remove del tags
    .replace(/<ins/gi, '') // Remove ins tags
    .replace(/<mark/gi, '') // Remove mark tags
    .replace(/<small/gi, '') // Remove small tags
    .replace(/<sub/gi, '') // Remove sub tags
    .replace(/<sup/gi, '') // Remove sup tags
    .replace(/<q/gi, '') // Remove q tags
    .replace(/<cite/gi, '') // Remove cite tags
    .replace(/<abbr/gi, '') // Remove abbr tags
    .replace(/<acronym/gi, '') // Remove acronym tags
    .replace(/<address/gi, '') // Remove address tags
    .replace(/<blockquote/gi, '') // Remove blockquote tags
    .replace(/<aside/gi, '') // Remove aside tags
    .replace(/<article/gi, '') // Remove article tags
    .replace(/<section/gi, '') // Remove section tags
    .replace(/<nav/gi, '') // Remove nav tags
    .replace(/<header/gi, '') // Remove header tags
    .replace(/<footer/gi, '') // Remove footer tags
    .replace(/<main/gi, '') // Remove main tags
    .replace(/<figure/gi, '') // Remove figure tags
    .replace(/<figcaption/gi, '') // Remove figcaption tags
    .replace(/<time/gi, '') // Remove time tags
    .replace(/<data/gi, '') // Remove data tags
    .replace(/<ruby/gi, '') // Remove ruby tags
    .replace(/<rt/gi, '') // Remove rt tags
    .replace(/<rp/gi, '') // Remove rp tags
    .replace(/<bdi/gi, '') // Remove bdi tags
    .replace(/<bdo/gi, '') // Remove bdo tags
    .replace(/<wbr/gi, '') // Remove wbr tags
    .replace(/<ins/gi, '') // Remove ins tags
    .replace(/<del/gi, '') // Remove del tags
    .replace(/<s/gi, '') // Remove s tags
    .replace(/<strike/gi, '') // Remove strike tags
    .replace(/<u/gi, '') // Remove u tags
    .replace(/<i/gi, '') // Remove i tags
    .replace(/<em/gi, '') // Remove em tags
    .replace(/<b/gi, '') // Remove b tags
    .replace(/<strong/gi, '') // Remove strong tags
    .replace(/<var/gi, '') // Remove var tags
    .replace(/<samp/gi, '') // Remove samp tags
    .replace(/<kbd/gi, '') // Remove kbd tags
    .replace(/<code/gi, '') // Remove code tags
    .replace(/<pre/gi, '') // Remove pre tags
    .replace(/<colgroup/gi, '') // Remove colgroup tags
    .replace(/<col/gi, '') // Remove col tags
    .replace(/<caption/gi, '') // Remove caption tags
    .replace(/<tfoot/gi, '') // Remove tfoot tags
    .replace(/<tbody/gi, '') // Remove tbody tags
    .replace(/<thead/gi, '') // Remove thead tags
    .replace(/<th/gi, '') // Remove th tags
    .replace(/<td/gi, '') // Remove td tags
    .replace(/<tr/gi, '') // Remove tr tags
    .replace(/<table/gi, '') // Remove table tags
    .replace(/<dd/gi, '') // Remove dd tags
    .replace(/<dt/gi, '') // Remove dt tags
    .replace(/<dl/gi, '') // Remove dl tags
    .replace(/<li/gi, '') // Remove li tags
    .replace(/<ol/gi, '') // Remove ol tags
    .replace(/<ul/gi, '') // Remove ul tags
    .replace(/<h[1-6]/gi, '') // Remove heading tags
    .replace(/<p/gi, '') // Remove p tags
    .replace(/<span/gi, '') // Remove span tags
    .replace(/<div/gi, '') // Remove div tags
    .replace(/<hr/gi, '') // Remove hr tags
    .replace(/<br/gi, '') // Remove br tags
    .replace(/<wbr/gi, '') // Remove wbr tags
    .replace(/<param/gi, '') // Remove param tags
    .replace(/<command/gi, '') // Remove command tags
    .replace(/<keygen/gi, '') // Remove keygen tags
    .replace(/<datalist/gi, '') // Remove datalist tags
    .replace(/<option/gi, '') // Remove option tags
    .replace(/<optgroup/gi, '') // Remove optgroup tags
    .replace(/<legend/gi, '') // Remove legend tags
    .replace(/<fieldset/gi, '') // Remove fieldset tags
    .replace(/<output/gi, '') // Remove output tags
    .replace(/<progress/gi, '') // Remove progress tags
    .replace(/<meter/gi, '') // Remove meter tags
    .replace(/<menuitem/gi, '') // Remove menuitem tags
    .replace(/<menu/gi, '') // Remove menu tags
    .replace(/<dialog/gi, '') // Remove dialog tags
    .replace(/<summary/gi, '') // Remove summary tags
    .replace(/<details/gi, '') // Remove details tags
    .replace(/<area/gi, '') // Remove area tags
    .replace(/<map/gi, '') // Remove map tags
    .replace(/<canvas/gi, '') // Remove canvas tags
    .replace(/<track/gi, '') // Remove track tags
    .replace(/<source/gi, '') // Remove source tags
    .replace(/<audio/gi, '') // Remove audio tags
    .replace(/<video/gi, '') // Remove video tags
    .replace(/<template/gi, '') // Remove template tags
    .replace(/<noscript/gi, '') // Remove noscript tags
    .replace(/<noframes/gi, '') // Remove noframes tags
    .replace(/<frame/gi, '') // Remove frame tags
    .replace(/<frameset/gi, '') // Remove frameset tags
    .replace(/<title/gi, '') // Remove title tags
    .replace(/<html/gi, '') // Remove html tags
    .replace(/<head/gi, '') // Remove head tags
    .replace(/<body/gi, '') // Remove body tags
    .replace(/<base/gi, '') // Remove base tags
    .replace(/<applet/gi, '') // Remove applet tags
    .replace(/<math/gi, '') // Remove math tags
    .replace(/<svg/gi, '') // Remove svg tags
    .replace(/<img/gi, '') // Remove img tags
    .replace(/<a\s+href/gi, '') // Remove anchor tags with href
    .replace(/<button/gi, '') // Remove button tags
    .replace(/<select/gi, '') // Remove select tags
    .replace(/<textarea/gi, '') // Remove textarea tags
    .replace(/<input/gi, '') // Remove input tags
    .replace(/<form/gi, '') // Remove form tags
    .replace(/<style/gi, '') // Remove style tags
    .replace(/<meta/gi, '') // Remove meta tags
    .replace(/<link/gi, '') // Remove link tags
    .replace(/<embed/gi, '') // Remove embed tags
    .replace(/<object/gi, '') // Remove object tags
    .replace(/<iframe/gi, '') // Remove iframe tags
    .replace(/<\/script>/gi, '') // Remove closing script tags
    .replace(/<script/gi, '') // Remove script tags
    .replace(/@import/gi, '') // Remove CSS imports
    .replace(/url\(/gi, '') // Remove CSS url() functions
    .replace(/expression\(/gi, '') // Remove CSS expressions
    .replace(/vbscript:/gi, '') // Remove vbscript: protocol
    .replace(/data:/gi, '') // Remove data: protocol
    .replace(/on\w+=/gi, '') // Remove event handlers
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/[<>]/g, ''); // Remove potential HTML tags
}

export function sanitizeEmail(email: string): string {
  return sanitizeString(email).toLowerCase();
}

export function sanitizePhone(phone: string): string {
  return phone.replace(/[^\d+]/g, ''); // Keep only digits and +
}

// Rate limiting validation
export function validateRateLimit(
  attempts: number,
  maxAttempts: number = 5,
  timeWindow: number = 15 * 60 * 1000 // 15 minutes
): boolean {
  // This would typically check against a store or cache
  // For now, just return true
  return attempts < maxAttempts;
}





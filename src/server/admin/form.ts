/** A text field of a submitted form; an empty string when it is missing or is a file. */
export function formText(form: FormData, name: string): string {
  const value = form.get(name);
  return typeof value === 'string' ? value : '';
}

/** The submitted form, or an empty one when the body is not a form. */
export async function readForm(request: Request): Promise<FormData> {
  try {
    return await request.formData();
  } catch {
    return new FormData();
  }
}

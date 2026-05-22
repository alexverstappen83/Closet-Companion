/** Bouwt de beveiligde URL voor een opgeslagen afbeelding (client-veilig). */
export function imageUrl(imagePath: string): string {
  return `/api/uploads/${imagePath}`;
}

import "server-only";
import { revalidatePath } from "next/cache";

/** Invalidate the public food catalog and its cached detail pages after a real data change. */
export function revalidateFoodPages(id?: string) {
  // The catalog is indefinitely cached. Revalidating its path also refreshes
  // the Firestore fetches used by that page without a recurring timer.
  revalidatePath("/food");
  // A catalog change can affect related-restaurants on any detail page.
  revalidatePath("/food/[id]", "page");
  if (id) revalidatePath(`/food/${id}`);
}

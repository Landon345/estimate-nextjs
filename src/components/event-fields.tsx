import { DatePicker } from "@/components/date-picker";
import { Field, Input, Select, Textarea } from "@/components/ui";
import { addDays, toDateInput, today } from "@/lib/dates";

/** Fields shared by the suggest and edit event forms. */
export function EventFields({
  categories,
  event,
}: {
  categories: { id: number; name: string }[];
  event?: { name: string; description: string; categoryId: number | null; eventDate: Date };
}) {
  return (
    <>
      <Field label="Name" htmlFor="name">
        <Input id="name" name="name" defaultValue={event?.name} maxLength={50} required />
      </Field>
      <Field label="Category" htmlFor="categoryId">
        <Select id="categoryId" name="categoryId" defaultValue={event?.categoryId ?? ""} required>
          <option value="" disabled>
            Choose a category
          </option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Description" htmlFor="description">
        <Textarea id="description" name="description" defaultValue={event?.description} rows={3} maxLength={500} required />
      </Field>
      <Field label="Event Date" htmlFor="eventDate">
        <DatePicker
          id="eventDate"
          name="eventDate"
          defaultValue={event ? toDateInput(event.eventDate) : ""}
          min={toDateInput(addDays(today(), 1))}
          required
        />
      </Field>
    </>
  );
}

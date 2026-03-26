import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import PhotoLightbox from "@/components/spots/PhotoLightbox";

const mockPhotos = [
  { photo_url: "https://example.com/1.jpg", author_name: "Alice" },
  { photo_url: "https://example.com/2.jpg", author_name: null },
  { photo_url: "https://example.com/3.jpg", author_name: "Bob" },
];

describe("PhotoLightbox", () => {
  it("renders with correct photo displayed", () => {
    render(
      <PhotoLightbox photos={mockPhotos} initialIndex={0} onClose={() => {}} />
    );
    const img = document.querySelector("img");
    expect(img).toHaveAttribute("src", "https://example.com/1.jpg");
  });

  it('shows counter "1 / 3" for 3 photos', () => {
    render(
      <PhotoLightbox photos={mockPhotos} initialIndex={0} onClose={() => {}} />
    );
    expect(screen.getByText("1 / 3")).toBeInTheDocument();
  });

  it("shows attribution when author_name exists", () => {
    render(
      <PhotoLightbox photos={mockPhotos} initialIndex={0} onClose={() => {}} />
    );
    expect(screen.getByText("Photo: Alice")).toBeInTheDocument();
  });

  it("does NOT show attribution when author_name is null", () => {
    render(
      <PhotoLightbox photos={mockPhotos} initialIndex={1} onClose={() => {}} />
    );
    expect(screen.queryByText(/Photo:/)).not.toBeInTheDocument();
  });

  it("calls onClose when X button clicked", () => {
    const onClose = vi.fn();
    render(
      <PhotoLightbox photos={mockPhotos} initialIndex={0} onClose={onClose} />
    );
    // The X button is the first button element (top-right close)
    const buttons = screen.getAllByRole("button");
    // Click the close button (first one)
    fireEvent.click(buttons[0]);
    expect(onClose).toHaveBeenCalled();
  });

  it("calls onClose when backdrop clicked", () => {
    const onClose = vi.fn();
    const { container } = render(
      <PhotoLightbox photos={mockPhotos} initialIndex={0} onClose={onClose} />
    );
    // Click the backdrop (the outermost fixed div)
    const backdrop = container.firstElementChild as HTMLElement;
    fireEvent.click(backdrop);
    expect(onClose).toHaveBeenCalled();
  });

  it("navigation: next/prev updates displayed photo", () => {
    render(
      <PhotoLightbox photos={mockPhotos} initialIndex={0} onClose={() => {}} />
    );
    expect(screen.getByText("1 / 3")).toBeInTheDocument();

    // Use keyboard arrow right to go next
    fireEvent.keyDown(window, { key: "ArrowRight" });
    expect(screen.getByText("2 / 3")).toBeInTheDocument();

    // Use keyboard arrow left to go back
    fireEvent.keyDown(window, { key: "ArrowLeft" });
    expect(screen.getByText("1 / 3")).toBeInTheDocument();
  });

  it("keyboard: Escape calls onClose", () => {
    const onClose = vi.fn();
    render(
      <PhotoLightbox photos={mockPhotos} initialIndex={0} onClose={onClose} />
    );
    fireEvent.keyDown(window, { key: "Escape" });
    expect(onClose).toHaveBeenCalled();
  });
});

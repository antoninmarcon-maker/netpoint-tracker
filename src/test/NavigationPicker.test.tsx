import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import NavigationPicker from "@/components/spots/NavigationPicker";

// Mock sonner toast
vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

const defaultProps = {
  lat: 48.8566,
  lng: 2.3522,
  address: "123 Rue de Paris",
  onClose: vi.fn(),
};

describe("NavigationPicker", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders all navigation options (Google Maps, Waze, Apple Plans)", () => {
    render(<NavigationPicker {...defaultProps} />);
    expect(screen.getByText("Google Maps")).toBeInTheDocument();
    expect(screen.getByText("Waze")).toBeInTheDocument();
    expect(screen.getByText("Apple Plans")).toBeInTheDocument();
  });

  it("Google Maps link has correct URL with lat/lng", () => {
    render(<NavigationPicker {...defaultProps} />);
    const link = screen.getByText("Google Maps").closest("a");
    expect(link).toHaveAttribute(
      "href",
      "https://www.google.com/maps/dir/?api=1&destination=48.8566,2.3522"
    );
  });

  it("Waze link has correct URL", () => {
    render(<NavigationPicker {...defaultProps} />);
    const link = screen.getByText("Waze").closest("a");
    expect(link).toHaveAttribute(
      "href",
      "https://waze.com/ul?ll=48.8566,2.3522&navigate=yes"
    );
  });

  it("copy address button works", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, {
      clipboard: { writeText },
    });

    const onClose = vi.fn();
    render(<NavigationPicker {...defaultProps} onClose={onClose} />);

    const copyBtn = screen.getByText("Copier l'adresse");
    fireEvent.click(copyBtn);

    expect(writeText).toHaveBeenCalledWith("123 Rue de Paris");
    expect(onClose).toHaveBeenCalled();
  });

  it("calls onClose when backdrop clicked", () => {
    const onClose = vi.fn();
    const { container } = render(
      <NavigationPicker {...defaultProps} onClose={onClose} />
    );
    // The backdrop is the first child div (fixed inset-0 with bg-black/40)
    const backdrop = container.firstElementChild as HTMLElement;
    fireEvent.click(backdrop);
    expect(onClose).toHaveBeenCalled();
  });
});

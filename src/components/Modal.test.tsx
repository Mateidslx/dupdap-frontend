import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Modal from './Modal';

describe('Modal component', () => {
  afterEach(() => {
    cleanup();
  });

  it('renders nothing when open is false', () => {
    const { container } = render(
      <Modal open={false} onClose={vi.fn()}>
        <div>Modal Content</div>
      </Modal>,
    );

    expect(container.firstChild).toBeNull();
    expect(screen.queryByText('Modal Content')).not.toBeInTheDocument();
  });

  it('renders title and children when open is true', () => {
    render(
      <Modal open={true} onClose={vi.fn()} title="Test Modal" testId="test-modal">
        <div>Modal Content</div>
      </Modal>,
    );

    expect(screen.getByRole('dialog', { name: 'Test Modal' })).toBeInTheDocument();
    expect(screen.getByText('Test Modal')).toBeInTheDocument();
    expect(screen.getByText('Modal Content')).toBeInTheDocument();
  });

  it('calls onClose when close button is clicked', async () => {
    const onClose = vi.fn();
    render(
      <Modal open={true} onClose={onClose} title="Test Modal">
        <div>Modal Content</div>
      </Modal>,
    );

    const closeBtn = screen.getByRole('button', { name: 'Close dialog' });
    await userEvent.click(closeBtn);

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when Escape key is pressed', () => {
    const onClose = vi.fn();
    render(
      <Modal open={true} onClose={onClose} title="Test Modal">
        <div>Modal Content</div>
      </Modal>,
    );

    fireEvent.keyDown(document, { key: 'Escape' });

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when clicking directly on backdrop (mousedown and click on backdrop)', () => {
    const onClose = vi.fn();
    render(
      <Modal open={true} onClose={onClose} title="Test Modal">
        <div>Modal Content</div>
      </Modal>,
    );

    const backdrop = screen.getByTestId('modal-backdrop');

    // Simulate clicking directly on the backdrop
    fireEvent.mouseDown(backdrop);
    fireEvent.click(backdrop);

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('does NOT call onClose when dragging text selection from inside panel out to backdrop (#409)', () => {
    const onClose = vi.fn();
    render(
      <Modal open={true} onClose={onClose} title="Test Modal">
        <p data-testid="selectable-text">Stellar Memo: MEMO123456</p>
      </Modal>,
    );

    const textEl = screen.getByTestId('selectable-text');
    const backdrop = screen.getByTestId('modal-backdrop');

    // Simulate mouse down inside the panel (start text drag)
    fireEvent.mouseDown(textEl);
    // Simulate releasing mouse outside panel bounds onto the backdrop
    fireEvent.click(backdrop);

    // Modal should NOT close
    expect(onClose).not.toHaveBeenCalled();
  });
});

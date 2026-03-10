import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import App from '../App';

describe('App', () => {
  it('renders CloudMart heading', () => {
    render(<App />);
    expect(screen.getByText('CloudMart')).toBeInTheDocument();
  });
});

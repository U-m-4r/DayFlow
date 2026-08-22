import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Status } from './ui';
describe('Status',()=>{it('renders a readable state label',()=>{render(<Status value="APPROVED"/>);expect(screen.getByText('APPROVED')).toBeTruthy();});});

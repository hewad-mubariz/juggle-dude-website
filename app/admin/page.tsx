import type { Metadata } from 'next';
import { AdminPanel } from '@/components/admin/admin-panel';
export const metadata:Metadata={title:'Review desk',description:'Private Juggle Dude review desk.',robots:{index:false,follow:false}};
export default function Admin() { return <AdminPanel />; }

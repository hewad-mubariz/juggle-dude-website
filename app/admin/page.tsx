import type { Metadata } from 'next';
import { AdminPanel } from '@/components/admin/admin-panel';
export const metadata:Metadata={title:'Admin',description:'Private Juggle Dude analytics and review workspace.',robots:{index:false,follow:false}};
export default function Admin() { return <AdminPanel />; }

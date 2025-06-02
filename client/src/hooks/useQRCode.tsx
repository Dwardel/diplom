import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { query } from 'express';

export function useQRCode() {
  const [qrValue, setQrValue] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  // For teachers to generate QR codes
  const generateQRCode = async (classId: number) => {
    setIsLoading(true);
    try {
      const res = await apiRequest('POST', `/api/teacher/classes/${classId}/qr`, {});
      const data = await res.json();
      setQrValue(data.qrCode);
      return data.qrCode;
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to generate QR code',
        variant: 'destructive',
      });
      console.error('Error generating QR code', error);
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  // For students to scan and mark attendance
  const markAttendance = async (qrCode: string) => {
    setIsLoading(true);
    try {
      const res = await apiRequest('POST', '/api/student/attendance', { qrCode });
      const data = await res.json();
      toast({
        title: 'Success',
        description: 'Attendance marked successfully',
      });
      console.log(data);
     queryClient.invalidateQueries({ queryKey: [`/api/teacher/classes/${data.classId}/attendance`] });
      return data;
    } catch (error: any) {
      const errorMessage = error.message || 'Failed to mark attendance';
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    qrValue,
    isLoading,
    generateQRCode,
    markAttendance,
    resetQR: () => setQrValue(null),
  };
}

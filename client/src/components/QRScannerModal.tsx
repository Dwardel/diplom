import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { X, RefreshCw } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { useQRCode } from "@/hooks/useQRCode";
import { useToast } from "@/hooks/use-toast";
import { Html5Qrcode } from "html5-qrcode";

interface QRScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function QRScannerModal({
  isOpen,
  onClose,
  onSuccess,
}: QRScannerModalProps) {
  const [facingMode, setFacingMode] = useState<"environment" | "user">("environment");
  const { markAttendance, isLoading } = useQRCode();
  const { toast } = useToast();
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const scannerContainerId = "qr-scanner-container";

  const handleScanSuccess = async (decodedText: string) => {
    if (!decodedText) return;

    try {
      // Остановить сканер
      await scannerRef.current?.stop();
      scannerRef.current?.clear();

      await markAttendance(decodedText);

      toast({
        title: "Успех!",
        description: "Посещение успешно отмечено",
      });

      onSuccess?.();
      onClose();
    } catch (error: any) {
      toast({
        title: "Ошибка",
        description: error.message || "Не удалось отметить посещение",
        variant: "destructive",
      });
    }
  };

  const handleScanError = (error: any) => {
    console.warn("Ошибка сканирования QR:", error);
  };

  const startScanner = async () => {
  if (!isOpen) return;

  const el = document.getElementById(scannerContainerId);
  if (!el) {
    // Подождать, пока DOM-элемент появится
    setTimeout(startScanner, 100); // повторить попытку через 100ms
    return;
  }

  const config = {
    fps: 10,
    qrbox: 250,
    aspectRatio: 1,
  };

  const cameraConfig = { facingMode };

  if (!scannerRef.current) {
    scannerRef.current = new Html5Qrcode(scannerContainerId);
  }

  try {
    await scannerRef.current.start(
      cameraConfig,
      config,
      handleScanSuccess,
      handleScanError
    );
  } catch (err) {
    console.error("Не удалось запустить сканер:", err);
    toast({
      title: "Ошибка",
      description: "Не удалось запустить сканер QR-кода",
      variant: "destructive",
    });
  }
};

  const stopScanner = async () => {
    if (scannerRef.current) {
      await scannerRef.current.stop().catch(console.error);
      scannerRef.current.clear()
    }
  };

  useEffect(() => {
    if (isOpen) {
      startScanner();
    } else {
      stopScanner();
    }

    return () => {
      stopScanner();
    };
  }, [isOpen, facingMode]);

const toggleCamera = async () => {
  if (!scannerRef.current) return;

  try {
    await scannerRef.current.stop();
    await scannerRef.current.clear();
  } catch (err) {
    console.warn("Ошибка при остановке сканера:", err);
  }

  // Переключить камеру и перезапустить сканер
  setFacingMode((prev) => (prev === "environment" ? "user" : "environment"));
};

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-medium text-gray-800">
            Сканировать QR-код
          </DialogTitle>
        </DialogHeader>

        <div className="text-center mb-4">
          <p className="text-gray-600">
            Наведите камеру на QR-код преподавателя
          </p>
        </div>

        <div className="flex justify-center mb-6">
          <div className="relative w-64 h-64 overflow-hidden rounded-lg">
            <div
              id={scannerContainerId}
              className="w-full h-full rounded-lg bg-black"
            />
            <div className="absolute inset-0 border-2 border-white opacity-50 rounded pointer-events-none" />
            <div className="absolute top-0 left-0 w-12 h-12 border-t-4 border-l-4 border-white rounded-tl-lg pointer-events-none" />
            <div className="absolute top-0 right-0 w-12 h-12 border-t-4 border-r-4 border-white rounded-tr-lg pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-12 h-12 border-b-4 border-l-4 border-white rounded-bl-lg pointer-events-none" />
            <div className="absolute bottom-0 right-0 w-12 h-12 border-b-4 border-r-4 border-white rounded-br-lg pointer-events-none" />
          </div>
        </div>

        <div className="space-y-3">
          <Button
            className="w-full"
            variant="outline"
            onClick={toggleCamera}
            disabled={isLoading}
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Сменить камеру
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

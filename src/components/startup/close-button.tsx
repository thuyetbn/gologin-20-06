import { Button } from '@/components/ui/button';

export function CloseStartupPopupButton() {
  const onClose = () => {
    // Gửi tín hiệu đóng popup về main
    (window as any).api?.send('startup:close' as any, {});
  };
  return (
    <div className="flex justify-end">
      <Button variant="default" onClick={onClose}>Đóng</Button>
    </div>
  );
}


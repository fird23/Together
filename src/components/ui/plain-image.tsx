import type { ImgHTMLAttributes } from "react";

/**
 * Обычная картинка для временных ссылок на закрытые фото и для превью из памяти устройства.
 * Оптимизатор next/image здесь не подходит: ссылки подписанные и меняются, а превью — локальные адреса blob:.
 * Единственное исключение для линтера вынесено сюда, чтобы не рассыпать его по всему коду.
 */
export function PlainImage({ alt = "", ...props }: ImgHTMLAttributes<HTMLImageElement>) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img alt={alt} {...props} />;
}

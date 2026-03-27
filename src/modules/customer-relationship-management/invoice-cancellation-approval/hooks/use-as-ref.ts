import * as React from "react";

import { useIsomorphicLayoutEffect } from "@/modules/customer-relationship-management/invoice-cancellation-approval/hooks/use-isomorphic-layout-effect";

function useAsRef<T>(props: T) {
  const ref = React.useRef<T>(props);

  useIsomorphicLayoutEffect(() => {
    ref.current = props;
  });

  return ref;
}

export { useAsRef };

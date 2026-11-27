import type { ReactNode } from "react"
import { Check, ChevronDown } from "lucide-react"
import { DropdownMenu } from "radix-ui"

export interface FilterOption {
  value: string
  label: string
  icon?: ReactNode
}

/**
 * Uma lista suspensa de filtro: o botão mostra o rótulo e a escolha atual, e a
 * lista abre com as opções (cada uma pode ter ícone). A primeira opção é o
 * padrão ("sem filtro"); qualquer outra deixa o botão destacado. Teclado e
 * leitor de tela vêm do menu do Radix (setas, Enter, Esc).
 */
export function FilterMenu({
  label,
  icon,
  value,
  options,
  onChange,
}: {
  label: string
  icon: ReactNode
  value: string
  options: FilterOption[]
  onChange: (value: string) => void
}) {
  const current = options.find((o) => o.value === value) ?? options[0]
  const active = current !== options[0]

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger
        data-active={active}
        className="group inline-flex h-12 w-full min-w-0 items-center gap-3 sm:w-auto rounded-md border border-border bg-background px-3 text-left transition-colors hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring data-[active=true]:border-foreground data-[state=open]:bg-muted"
      >
        <span
          aria-hidden="true"
          className="flex shrink-0 items-center text-muted-foreground [&>svg]:h-5 [&>svg]:w-5"
        >
          {current.icon ?? icon}
        </span>
        <span className="flex min-w-0 flex-col leading-tight">
          <span className="font-sans text-[11px] tracking-[0.08em] text-muted-foreground uppercase">
            {label}
          </span>
          <span className="truncate font-sans text-sm text-foreground">
            {current.label}
          </span>
        </span>
        <ChevronDown
          aria-hidden="true"
          className="ml-auto h-4 w-4 shrink-0 text-muted-foreground group-data-[state=open]:rotate-180 sm:ml-1"
        />
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="start"
          sideOffset={6}
          collisionPadding={16}
          className="z-60 max-h-(--radix-dropdown-menu-content-available-height) min-w-[14rem] overflow-y-auto rounded-lg border border-border bg-popover p-1.5 text-popover-foreground motion-safe:data-[state=open]:animate-[rise-in_160ms_ease-out]"
        >
          <DropdownMenu.RadioGroup value={value} onValueChange={onChange}>
            {options.map((option) => (
              <DropdownMenu.RadioItem
                key={option.value}
                value={option.value}
                className="flex min-h-11 cursor-pointer items-center gap-3 rounded-md px-3 py-2 font-sans text-sm text-foreground outline-none data-[highlighted]:bg-muted data-[state=checked]:font-medium"
              >
                {option.icon ? (
                  <span
                    aria-hidden="true"
                    className="flex w-10 shrink-0 justify-center"
                  >
                    {option.icon}
                  </span>
                ) : null}
                <span className="flex-1">{option.label}</span>
                <DropdownMenu.ItemIndicator>
                  <Check aria-hidden="true" className="h-4 w-4" />
                </DropdownMenu.ItemIndicator>
              </DropdownMenu.RadioItem>
            ))}
          </DropdownMenu.RadioGroup>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  )
}

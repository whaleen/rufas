// src/components/tree-view.tsx
import React from 'react'
import * as AccordionPrimitive from '@radix-ui/react-accordion'
import { ChevronRight } from 'lucide-react'
import { cva } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const treeVariants = cva(
    'group hover:before:opacity-100 before:absolute before:rounded-lg before:left-0 px-2 before:w-full before:opacity-0 before:bg-accent/70 before:h-[2rem] before:-z-10'
)

const selectedTreeVariants = cva(
    'before:opacity-100 before:bg-accent/70 text-accent-foreground'
)

interface TreeDataItem {
    id: string
    name: string
    icon?: any
    selectedIcon?: any
    openIcon?: any
    children?: TreeDataItem[]
    actions?: React.ReactNode
    onClick?: () => void
}

type TreeProps = React.HTMLAttributes<HTMLDivElement> & {
    data: TreeDataItem[] | TreeDataItem
    selectedItems?: string[]
    onSelectChange?: (selectedIds: string[]) => void
    expandAll?: boolean
    defaultNodeIcon?: any
    defaultLeafIcon?: any
}

const TreeView = React.forwardRef<HTMLDivElement, TreeProps>(
    (
        {
            data,
            selectedItems = [],
            onSelectChange,
            expandAll,
            defaultLeafIcon,
            defaultNodeIcon,
            className,
            ...props
        },
        ref
    ) => {
        const handleSelectChange = React.useCallback(
            (item: TreeDataItem, e: React.MouseEvent) => {
                if (!onSelectChange) return

                const newSelection = [...selectedItems]
                const index = newSelection.indexOf(item.id)

                if (e.metaKey || e.ctrlKey) {
                    // Toggle selection
                    if (index > -1) {
                        newSelection.splice(index, 1)
                    } else {
                        newSelection.push(item.id)
                    }
                } else {
                    // Single select
                    newSelection.splice(0, newSelection.length)
                    newSelection.push(item.id)
                }

                onSelectChange(newSelection)
            },
            [onSelectChange, selectedItems]
        )

        const expandedItemIds = React.useMemo(() => {
            const ids: string[] = []

            function walkTreeItems(items: TreeDataItem[] | TreeDataItem) {
                if (items instanceof Array) {
                    items.forEach(item => {
                        ids.push(item.id)
                        if (item.children) {
                            walkTreeItems(item.children)
                        }
                    })
                } else if (items.children) {
                    ids.push(items.id)
                    walkTreeItems(items.children)
                }
            }

            if (expandAll) {
                walkTreeItems(data)
            }
            return ids
        }, [data, expandAll])

        return (
            <div className={cn('overflow-hidden relative p-2', className)}>
                <TreeItem
                    data={data}
                    ref={ref}
                    selectedItems={selectedItems}
                    handleSelectChange={handleSelectChange}
                    expandedItemIds={expandedItemIds}
                    defaultLeafIcon={defaultLeafIcon}
                    defaultNodeIcon={defaultNodeIcon}
                    {...props}
                />
            </div>
        )
    }
)
TreeView.displayName = 'TreeView'

type TreeItemProps = TreeProps & {
    selectedItems: string[]
    handleSelectChange: (item: TreeDataItem, e: React.MouseEvent) => void
    expandedItemIds: string[]
    defaultNodeIcon?: any
    defaultLeafIcon?: any
}

const TreeItem = React.forwardRef<HTMLDivElement, TreeItemProps>(
    (
        {
            className,
            data,
            selectedItems,
            handleSelectChange,
            expandedItemIds,
            defaultNodeIcon,
            defaultLeafIcon,
            ...props
        },
        ref
    ) => {
        if (!(data instanceof Array)) {
            data = [data]
        }
        return (
            <div ref={ref} role="tree" className={className} {...props}>
                <ul>
                    {data.map((item) => (
                        <li key={item.id}>
                            {item.children ? (
                                <TreeNode
                                    item={item}
                                    selectedItems={selectedItems}
                                    expandedItemIds={expandedItemIds}
                                    handleSelectChange={handleSelectChange}
                                    defaultNodeIcon={defaultNodeIcon}
                                    defaultLeafIcon={defaultLeafIcon}
                                />
                            ) : (
                                <TreeLeaf
                                    item={item}
                                    selectedItems={selectedItems}
                                    handleSelectChange={handleSelectChange}
                                    defaultLeafIcon={defaultLeafIcon}
                                />
                            )}
                        </li>
                    ))}
                </ul>
            </div>
        )
    }
)
TreeItem.displayName = 'TreeItem'

const TreeNode = ({
    item,
    handleSelectChange,
    expandedItemIds,
    selectedItems,
    defaultNodeIcon,
    defaultLeafIcon
}: {
    item: TreeDataItem
    handleSelectChange: (item: TreeDataItem, e: React.MouseEvent) => void
    expandedItemIds: string[]
    selectedItems: string[]
    defaultNodeIcon?: any
    defaultLeafIcon?: any
}) => {
    const [value, setValue] = React.useState(
        expandedItemIds.includes(item.id) ? [item.id] : []
    )
    return (
        <AccordionPrimitive.Root
            type="multiple"
            value={value}
            onValueChange={(s) => setValue(s)}
        >
            <AccordionPrimitive.Item value={item.id}>
                <AccordionTrigger
                    className={cn(
                        treeVariants(),
                        selectedItems.includes(item.id) && selectedTreeVariants()
                    )}
                    onClick={(e) => {
                        e.stopPropagation()
                        handleSelectChange(item, e)
                        item.onClick?.()
                    }}
                >
                    <TreeIcon
                        item={item}
                        isSelected={selectedItems.includes(item.id)}
                        isOpen={value.includes(item.id)}
                        default={defaultNodeIcon}
                    />
                    <span className="text-sm truncate">{item.name}</span>
                    <TreeActions isSelected={selectedItems.includes(item.id)}>
                        {item.actions}
                    </TreeActions>
                </AccordionTrigger>
                <AccordionContent className="ml-4 pl-1 border-l">
                    <TreeItem
                        data={item.children ? item.children : item}
                        selectedItems={selectedItems}
                        handleSelectChange={handleSelectChange}
                        expandedItemIds={expandedItemIds}
                        defaultLeafIcon={defaultLeafIcon}
                        defaultNodeIcon={defaultNodeIcon}
                    />
                </AccordionContent>
            </AccordionPrimitive.Item>
        </AccordionPrimitive.Root>
    )
}

const TreeLeaf = React.forwardRef<
    HTMLDivElement,
    React.HTMLAttributes<HTMLDivElement> & {
        item: TreeDataItem
        selectedItems: string[]
        handleSelectChange: (item: TreeDataItem, e: React.MouseEvent) => void
        defaultLeafIcon?: any
    }
>(
    (
        {
            className,
            item,
            selectedItems,
            handleSelectChange,
            defaultLeafIcon,
            ...props
        },
        ref
    ) => {
        return (
            <div
                ref={ref}
                className={cn(
                    'ml-5 flex text-left items-center py-2 cursor-pointer before:right-1',
                    treeVariants(),
                    className,
                    selectedItems.includes(item.id) && selectedTreeVariants()
                )}
                onClick={(e) => {
                    e.stopPropagation()
                    handleSelectChange(item, e)
                    item.onClick?.()
                }}
                {...props}
            >
                <TreeIcon
                    item={item}
                    isSelected={selectedItems.includes(item.id)}
                    default={defaultLeafIcon}
                />
                <span className="flex-grow text-sm truncate">{item.name}</span>
                <TreeActions isSelected={selectedItems.includes(item.id)}>
                    {item.actions}
                </TreeActions>
            </div>
        )
    }
)
TreeLeaf.displayName = 'TreeLeaf'

const AccordionTrigger = React.forwardRef<
    React.ElementRef<typeof AccordionPrimitive.Trigger>,
    React.ComponentPropsWithoutRef<typeof AccordionPrimitive.Trigger>
>(({ className, children, ...props }, ref) => (
    <AccordionPrimitive.Header>
        <AccordionPrimitive.Trigger
            ref={ref}
            className={cn(
                'flex flex-1 w-full items-center py-2 transition-all first:[&[data-state=open]>svg]:rotate-90',
                className
            )}
            {...props}
        >
            <ChevronRight className="h-4 w-4 shrink-0 transition-transform duration-200 text-accent-foreground/50 mr-1" />
            {children}
        </AccordionPrimitive.Trigger>
    </AccordionPrimitive.Header>
))
AccordionTrigger.displayName = AccordionPrimitive.Trigger.displayName

const AccordionContent = React.forwardRef<
    React.ElementRef<typeof AccordionPrimitive.Content>,
    React.ComponentPropsWithoutRef<typeof AccordionPrimitive.Content>
>(({ className, children, ...props }, ref) => (
    <AccordionPrimitive.Content
        ref={ref}
        className={cn(
            'overflow-hidden text-sm transition-all data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down',
            className
        )}
        {...props}
    >
        <div className="pb-1 pt-0">{children}</div>
    </AccordionPrimitive.Content>
))
AccordionContent.displayName = AccordionPrimitive.Content.displayName

const TreeIcon = ({
    item,
    isOpen,
    isSelected,
    default: defaultIcon
}: {
    item: TreeDataItem
    isOpen?: boolean
    isSelected?: boolean
    default?: any
}) => {
    let Icon = defaultIcon
    if (isSelected && item.selectedIcon) {
        Icon = item.selectedIcon
    } else if (isOpen && item.openIcon) {
        Icon = item.openIcon
    } else if (item.icon) {
        Icon = item.icon
    }
    return Icon ? (
        <Icon className="h-4 w-4 shrink-0 mr-2" />
    ) : (
        <></>
    )
}

const TreeActions = ({
    children,
    isSelected,
    className
}: {
    children: React.ReactNode
    isSelected: boolean
    className?: string
}) => {
    return (
        <div
            className={cn(
                'absolute right-3',
                className,
                // Remove the hidden classes and hover states if it's a tag dot
                children && children.toString().includes('TagDots')
                    ? 'block'
                    : cn(
                        isSelected ? 'block' : 'hidden',
                        'group-hover:block'
                    )
            )}
        >
            {children}
        </div>
    )
}

export { TreeView, type TreeDataItem }

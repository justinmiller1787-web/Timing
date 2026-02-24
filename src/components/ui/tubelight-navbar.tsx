"use client"

import React, { useEffect, useState } from "react"
import { motion } from "framer-motion"
import Link from "next/link"
import { LucideIcon, Edit, Clock, BarChart2, LogOut } from "lucide-react"
import { cn } from "@/lib/utils"
import { usePathname } from "next/navigation"
import { useAuth } from "@/lib/auth"

interface NavItem {
    name: string
    url: string
    icon: LucideIcon
}

const items: NavItem[] = [
    { name: 'Log', url: '/', icon: Edit },
    { name: 'Timeline', url: '/timeline', icon: Clock },
    { name: 'Analytics', url: '/analytics', icon: BarChart2 }
]

interface NavBarProps {
    className?: string
}

export function NavBar({ className }: NavBarProps) {
    const pathname = usePathname()
    const { user, signOut } = useAuth()
    const [activeTab, setActiveTab] = useState(items[0].name)
    const [isMobile, setIsMobile] = useState(false)

    useEffect(() => {
        const handleResize = () => {
            setIsMobile(window.innerWidth < 768)
        }

        handleResize()
        window.addEventListener("resize", handleResize)
        return () => window.removeEventListener("resize", handleResize)
    }, [])

    useEffect(() => {
        const currentItem = items.find(item => item.url === pathname)
        if (currentItem) {
            setActiveTab(currentItem.name)
        }
    }, [pathname])

    if (!user) return null

    return (
        <div
            className={cn(
                "z-50 mb-6 pt-6",
                className
            )}
        >
            <div className="flex items-center gap-1 backdrop-blur-xl bg-blue-500/10 border border-white/20 py-1 px-1 rounded-full shadow-lg">
                {items.map((item) => {
                    const isActive = activeTab === item.name

                    return (
                        <Link
                            key={item.name}
                            href={item.url}
                            onClick={() => setActiveTab(item.name)}
                            className={cn(
                                "relative cursor-pointer text-sm font-semibold px-6 py-2 rounded-full transition-all duration-300",
                                "text-blue-400 hover:text-white hover:bg-white/10",
                                isActive && "bg-white/20 text-white shadow-md"
                            )}
                        >
                            <span className="hidden md:inline">{item.name}</span>
                            <span className="md:hidden">
                                <item.icon size={18} strokeWidth={2.5} />
                            </span>
                            {isActive && (
                                <motion.div
                                    layoutId="lamp"
                                    className="absolute inset-0 w-full bg-white/10 rounded-full -z-10"
                                    initial={false}
                                    transition={{
                                        type: "spring",
                                        stiffness: 300,
                                        damping: 30,
                                    }}
                                />
                            )}
                        </Link>
                    )
                })}

                <button
                    type="button"
                    onClick={signOut}
                    className="cursor-pointer text-sm font-semibold px-4 py-2 rounded-full transition-all duration-300 text-blue-400 hover:text-white hover:bg-white/10"
                    title="Sign out"
                >
                    <span className="hidden md:inline">Sign out</span>
                    <span className="md:hidden">
                        <LogOut size={18} strokeWidth={2.5} />
                    </span>
                </button>
            </div>
        </div>
    )
}

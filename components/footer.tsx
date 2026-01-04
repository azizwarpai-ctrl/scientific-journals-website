"use client"

import Link from "next/link"
import Image from "next/image"
import { Mail, Phone, MapPin } from "lucide-react"

export function Footer() {
  return (
    <footer className="border-t bg-muted/30">
      <div className="container mx-auto px-4 py-12 md:px-6">
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Image src="/images/logodigitopub.png" alt="DigitoPub" width={120} height={40} className="h-10 w-auto" />
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Advancing open, ethical, and impactful scholarly communication through digital innovation.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="mb-4 text-sm font-semibold">Quick Links</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/journals" className="text-muted-foreground hover:text-primary">
                  Journals
                </Link>
              </li>
              <li>
                <Link href="/about" className="text-muted-foreground hover:text-primary">
                  About
                </Link>
              </li>
              <li>
                <Link href="/help" className="text-muted-foreground hover:text-primary">
                  Help
                </Link>
              </li>
              <li>
                <Link href="/contact" className="text-muted-foreground hover:text-primary">
                  Contact
                </Link>
              </li>
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h3 className="mb-4 text-sm font-semibold">Resources</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/help" className="text-muted-foreground hover:text-primary">
                  Guide for Authors
                </Link>
              </li>
              <li>
                <Link href="/help" className="text-muted-foreground hover:text-primary">
                  Guide for Reviewers
                </Link>
              </li>
              <li>
                <Link href="/help" className="text-muted-foreground hover:text-primary">
                  Publication Ethics
                </Link>
              </li>
              <li>
                <Link href="/help" className="text-muted-foreground hover:text-primary">
                  FAQ
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="mb-4 text-sm font-semibold">Contact Info</h3>
            <ul className="space-y-3 text-sm">
              <li>
                <a href="mailto:contact@digitopub.com" className="flex items-center gap-2 text-muted-foreground hover:text-primary">
                  <Mail className="h-4 w-4" />
                  contact@digitopub.com
                </a>
              </li>
              <li>
                <a href="tel:+15551234567" className="flex items-center gap-2 text-muted-foreground hover:text-primary">
                  <Phone className="h-4 w-4" />
                  +1 (555) 123-4567
                </a>
              </li>
              <li className="flex items-start gap-2">
                <MapPin className="mt-0.5 h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">123 Academic Way, Research City</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 border-t pt-8 text-center text-sm text-muted-foreground">
          <p>
            © {new Date().getFullYear()} DigitoPub Scientific Journals. All rights reserved.
          </p>
          <div className="mt-2 flex justify-center gap-4">
            <Link href="#" className="hover:text-primary">
              Privacy Policy
            </Link>
            <Link href="#" className="hover:text-primary">
              Terms of Service
            </Link>
            <Link href="#" className="hover:text-primary">
              Data Protection
            </Link>
          </div>
        </div>
      </div>
    </footer>
  )
}

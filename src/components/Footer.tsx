"use client";

import React from 'react';
import { Link } from 'react-router-dom';

const Footer: React.FC = () => {
  return (
    <footer className="mt-8 border-t border-border/60 bg-background/90">
      <div className="container mx-auto px-3 sm:px-4 py-4 flex flex-col md:flex-row items-center justify-between gap-3 text-xs sm:text-sm text-muted-foreground">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-semibold text-foreground">وصلها</span>
          <span className="hidden sm:inline-block">•</span>
          <span className="hidden sm:inline-block">
            منصة تربط بين المسافرين والمرسلين بطريقة آمنة ومرنة.
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Link to="/about" className="hover:text-primary transition-colors">
            عن وصلها
          </Link>
          <span className="text-border">|</span>
          <Link to="/faq" className="hover:text-primary transition-colors">
            الأسئلة الشائعة
          </Link>
          <span className="text-border">|</span>
          <Link to="/terms" className="hover:text-primary transition-colors">
            شروط الاستخدام
          </Link>
          <span className="text-border">|</span>
          <Link to="/privacy" className="hover:text-primary transition-colors">
            سياسة الخصوصية
          </Link>
          <span className="text-border">|</span>
          <Link to="/contact" className="hover:text-primary transition-colors">
            تواصل معنا
          </Link>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
"use client";
import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle } from 'lucide-react';

const SuccessPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [countdown, setCountdown] = useState(15);
  
  // Get message from state or use default
  const message = location.state?.message || "تمت العملية بنجاح!";

  useEffect(() => {
    // Start countdown
    const countdownInterval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(countdownInterval);
          // Redirect to login after countdown
          navigate('/login');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    // Auto redirect after 15 seconds
    const redirectTimer = setTimeout(() => {
      navigate('/login');
    }, 15000);

    // Cleanup timers on unmount
    return () => {
      clearInterval(countdownInterval);
      clearTimeout(redirectTimer);
    };
  }, [navigate]);

  const handleLoginClick = () => {
    navigate('/login');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="bg-green-100 p-3 rounded-full">
              <CheckCircle className="h-12 w-12 text-green-600" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold text-green-600">
            تم بنجاح!
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-6">
          <p className="text-lg">{message}</p>
          <div className="bg-blue-50 p-4 rounded-lg">
            <p className="text-sm text-blue-800">
              سيتم توجيهك تلقائيًا إلى صفحة تسجيل الدخول خلال {countdown} ثانية
            </p>
          </div>
          <Button onClick={handleLoginClick} className="w-full py-6 text-lg">
            انتقل إلى تسجيل الدخول الآن
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default SuccessPage;
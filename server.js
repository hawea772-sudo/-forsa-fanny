const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json());

// قاعدة بيانات مؤقتة في الذاكرة (سنتعلم ربطها بـ MongoDB أو PostgreSQL لاحقاً)
let users = [];
let otps = {}; // لتخزين أكواد OTP المؤقتة

// 1. مسار إرسال كود OTP
app.post('/api/send-otp', (req, res) => {
    const { phone } = req.body;
    if (!phone) {
        return res.status(400).json({ success: false, message: 'رقم الهاتف مطلوب' });
    }

    // توليد كود عشوائي من 4 أرقام
    const generatedOtp = Math.floor(1000 + Math.random() * 9000).toString();
    otps[phone] = generatedOtp;

    console.log(`[OTP Sent] Phone: ${phone}, OTP: ${generatedOtp}`);

    return res.status(200).json({
        success: true,
        message: 'تم إرسال كود التحقق بنجاح',
        // ملاحظة: في بيئة الإنتاج الفعلية يتم إرسال الكود عبر بوابة SMS مثل Twilio
        otpDemo: generatedOtp 
    });
});

// 2. مسار التحقق وتسجيل الدخول
app.post('/api/login', (req, res) => {
    const { name, phone, role, otp } = req.body;

    if (otps[phone] && otps[phone] !== otp) {
        return res.status(400).json({ success: false, message: 'كود التحقق غير صحيح' });
    }

    delete otps[phone]; // مسح الكود بعد الاستخدام

    let user = users.find(u => u.phone === phone);
    if (!user) {
        user = {
            id: users.length + 1,
            name: name || 'مستخدم جديد',
            phone: phone,
            role: role || 'customer', // customer أو worker
            wallet: role === 'worker' ? 150.00 : 0.00 // رصيد ترحيبي للشغالين فقط
        };
        users.push(user);
    }

    return res.status(200).json({
        success: true,
        message: 'تم تسجيل الدخول بنجاح',
        user: user
    });
});

// 3. مسار استعلام المحفظة (مؤمن: يرفض الطلب للعملاء ويسمح فقط للشغالين)
app.get('/api/wallet/:userId', (req, res) => {
    const userId = parseInt(req.params.userId);
    const user = users.find(u => u.id === userId);

    if (!user) {
        return res.status(404).json({ success: false, message: 'المستخدم غير موجود' });
    }

    // حماية المحفظة: منع العملاء من الوصول
    if (user.role !== 'worker' && user.role !== 'provider' && user.role !== 'driver') {
        return res.status(403).json({
            success: false,
            message: 'غير مصرح للعملاء بالوصول لبيانات المحفظة'
        });
    }

    return res.status(200).json({
        success: true,
        balance: user.wallet,
        currency: 'EGP'
    });
});

// تشغيل السيرفر
app.listen(PORT, () => {
    console.log(`🚀 السيرفر يعمل بنجاح على المنفذ: http://localhost:${PORT}`);
});
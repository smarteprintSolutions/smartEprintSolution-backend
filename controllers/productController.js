const mongoose = require('mongoose');
const asyncHandler = require('express-async-handler');
const Product = require('../models/Product');
const Order = require('../models/Order');
const multer = require('multer');
const path = require('path');
const cloudinary = require('cloudinary').v2;
const XLSX = require('xlsx');

// Cloudinary Configuration
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

const storage = multer.memoryStorage();

function checkFileType(file, cb) {
    const filetypes = /jpg|jpeg|png|webp/i;
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = filetypes.test(file.mimetype);

    if (extname && mimetype) {
        return cb(null, true);
    } else {
        cb('Images only (jpg, jpeg, png, webp)!');
    }
}

const upload = multer({
    storage,
    fileFilter: function (req, file, cb) {
        checkFileType(file, cb);
    },
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB limit
    }
});

const uploadToCloudinary = async (buffer, filename) => {
    return new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
            {
                folder: 'products',
                public_id: `${Date.now()}-${filename}`,
                resource_type: 'image',
                transformation: [
                    { width: 800, height: 800, crop: 'limit' },
                    { quality: 'auto' }
                ]
            },
            (error, result) => {
                if (error) {
                    reject(error);
                } else {
                    resolve(result.secure_url);
                }
            }
        );
        uploadStream.end(buffer);
    });
};

const getProducts = asyncHandler(async (req, res) => {
    const categoryName = req.query.category;
    const search = req.query.search;
    const brand = req.query.brand;
    const sort = req.query.sort;
    const technology = req.query.technology;
    const usageCategory = req.query.usageCategory;
    const allInOneType = req.query.allInOneType;
    const wireless = req.query.wireless;
    const mainFunction = req.query.mainFunction;

    let query = {};
    
    if (categoryName && categoryName !== 'undefined' && categoryName !== 'null') {
        const Category = require('../models/Category');
        const category = await Category.findOne({ name: { $regex: new RegExp(`^${categoryName}$`, 'i') } });
        if (category) {
            query.category = category._id;
        } else {
            return res.json({ products: [], page: 1, pages: 0, total: 0 });
        }
    }

    if (search) {
        query.$or = [
            { title: { $regex: search, $options: 'i' } },
            { description: { $regex: search, $options: 'i' } },
            { brand: { $regex: search, $options: 'i' } },
        ];
    }

    if (technology) query.technology = technology;
    if (usageCategory) {
        const values = Array.isArray(usageCategory) ? usageCategory : usageCategory.split(',');
        query.usageCategory = { $in: values };
    }
    if (allInOneType) query.allInOneType = allInOneType;
    if (wireless) query.wireless = wireless;
    if (mainFunction) {
        const values = Array.isArray(mainFunction) ? mainFunction : mainFunction.split(',');
        query.mainFunction = { $in: values };
    }

    if (brand && brand !== 'undefined' && brand !== 'null') {
        query.brand = { $regex: brand, $options: 'i' };
    }

    let sortOption = {};
    if (sort === 'lowToHigh') sortOption.price = 1;
    else if (sort === 'highToLow') sortOption.price = -1;

    const pageSize = Number(req.query.limit) || 20;
    const page = Number(req.query.page) || 1;

    const count = await Product.countDocuments(query);
    const products = await Product.find(query)
        .populate('category', 'name')
        .sort(sortOption)
        .limit(pageSize)
        .skip(pageSize * (page - 1));

    res.json({ products, page, pages: Math.ceil(count / pageSize), total: count });
});

const getProductById = asyncHandler(async (req, res) => {
    const product = await Product.findById(req.params.id).populate('category', 'name');
    if (product) {
        res.json(product);
    } else {
        res.status(404);
        throw new Error('Product not found');
    }
});

const uploadImages = asyncHandler(async (req, res) => {
    if (!req.files || req.files.length === 0) {
        res.status(400);
        throw new Error('No files uploaded');
    }
    const uploadPromises = req.files.map(file =>
        uploadToCloudinary(file.buffer, file.originalname)
    );
    const imageUrls = await Promise.all(uploadPromises);
    res.json({ urls: imageUrls });
});

const createProduct = asyncHandler(async (req, res) => {
    let imageUrls = [];
    if (req.files && req.files.length > 0) {
        const uploadPromises = req.files.map(file =>
            uploadToCloudinary(file.buffer, file.originalname)
        );
        imageUrls = await Promise.all(uploadPromises);
    } else if (req.body.images) {
        imageUrls = typeof req.body.images === 'string' ? JSON.parse(req.body.images) : req.body.images;
    }

    const {
        name, title, brand, category, price, oldPrice, countInStock, description,
        shortDetails, shortSpecification, overview, technicalSpecification,
        color, width, height, depth, screenSize, reviews,
        technology, usageCategory, allInOneType, wireless, mainFunction
    } = req.body;

    const finalTitle = name || title;
    if (!finalTitle) {
        res.status(400);
        throw new Error('Product title/name is required');
    }

    const parseArrayField = (field) => {
        if (!field) return [];
        if (Array.isArray(field)) return field;
        if (typeof field === 'string') {
            try { return JSON.parse(field); } catch { return field.split(',').map(v => v.trim()).filter(Boolean); }
        }
        return [];
    };

    const product = new Product({
        user: req.user._id,
        title: finalTitle,
        slug: finalTitle.toLowerCase().replace(/[^a-z0-9 ]/g, "").replace(/\s+/g, "-"),
        brand: brand || 'Generic',
        category,
        price: Number(price) || 0,
        oldPrice: oldPrice ? Number(oldPrice) : 0,
        countInStock: Number(countInStock) || 0,
        description: description || '',
        shortDetails,
        shortSpecification,
        overview,
        technicalSpecification,
        images: imageUrls,
        color, width, height, depth, screenSize,
        numReviews: 0,
        rating: 0,
        technology: parseArrayField(technology),
        usageCategory: parseArrayField(usageCategory),
        allInOneType: parseArrayField(allInOneType),
        wireless,
        mainFunction: parseArrayField(mainFunction)
    });

    const createdProduct = await product.save();
    res.status(201).json(createdProduct);
});

const updateProduct = asyncHandler(async (req, res) => {
    const product = await Product.findById(req.params.id);
    if (product) {
        const { title, brand, category, price, oldPrice, countInStock, description } = req.body;
        product.title = title || product.title;
        product.brand = brand || product.brand;
        product.category = category || product.category;
        product.price = price || product.price;
        product.oldPrice = oldPrice ?? product.oldPrice;
        product.countInStock = countInStock ?? product.countInStock;
        product.description = description || product.description;

        if (req.files && req.files.length > 0) {
            const uploadPromises = req.files.map(file =>
                uploadToCloudinary(file.buffer, file.originalname)
            );
            const newImageUrls = await Promise.all(uploadPromises);
            product.images = [...product.images, ...newImageUrls];
        }

        const updatedProduct = await product.save();
        res.json(updatedProduct);
    } else {
        res.status(404);
        throw new Error('Product not found');
    }
});

const deleteProduct = asyncHandler(async (req, res) => {
    const product = await Product.findById(req.params.id);
    if (product) {
        await product.deleteOne();
        res.json({ message: 'Product removed' });
    } else {
        res.status(404);
        throw new Error('Product not found');
    }
});

module.exports = {
    getProducts,
    getProductById,
    createProduct,
    updateProduct,
    deleteProduct,
    upload,
    uploadImages
};

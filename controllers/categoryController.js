const asyncHandler = require('express-async-handler');
const Category = require('../models/Category');
const Product = require('../models/Product');

const getCategories = asyncHandler(async (req, res) => {
    const categories = await Category.find({});
    const categoriesWithCounts = await Promise.all(categories.map(async (cat) => {
        const count = await Product.countDocuments({ category: cat._id });
        return { ...cat.toObject(), count };
    }));
    res.json(categoriesWithCounts);
});

const getCategoryById = asyncHandler(async (req, res) => {
    const category = await Category.findById(req.params.id);
    if (category) res.json(category);
    else { res.status(404); throw new Error('Category not found'); }
});

const createCategory = asyncHandler(async (req, res) => {
    const { name, slug, image, description } = req.body;
    if (!name) { res.status(400); throw new Error('Category name is required'); }
    const generatedSlug = slug || name.toLowerCase().replace(/[^a-z0-9 ]/g, '').replace(/\s+/g, '-');
    const category = new Category({ name, slug: generatedSlug, image, description });
    const createdCategory = await category.save();
    res.status(201).json(createdCategory);
});

const updateCategory = asyncHandler(async (req, res) => {
    const { name, slug, image, description } = req.body;
    const category = await Category.findById(req.params.id);
    if (category) {
        category.name = name || category.name;
        category.slug = slug || category.slug;
        category.image = image || category.image;
        category.description = description || category.description;
        const updatedCategory = await category.save();
        res.json(updatedCategory);
    } else { res.status(404); throw new Error('Category not found'); }
});

const deleteCategory = asyncHandler(async (req, res) => {
    const category = await Category.findById(req.params.id);
    if (category) { await category.deleteOne(); res.json({ message: 'Category removed' }); }
    else { res.status(404); throw new Error('Category not found'); }
});

module.exports = { getCategories, getCategoryById, createCategory, updateCategory, deleteCategory };

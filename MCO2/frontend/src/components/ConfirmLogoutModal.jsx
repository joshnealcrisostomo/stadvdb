import React from 'react';

const ConfirmLogoutModal = ({ isOpen, onClose, onConfirm }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 font-poppins">

        <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-sm">
            <h2 className="text-xl font-bold mb-4 text-gray-800">Confirm Logout</h2>
            <p className="mb-6 text-gray-600">Are you sure you want to log out?</p>

            <div className="flex justify-end gap-4">
            <button
                onClick={onClose}
                className="py-2 px-4 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors"
            >
                Cancel
            </button>
            <button
                onClick={onConfirm}
                className="py-2 px-4 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors cursor-pointer"
            >
                Logout
            </button>
            </div>
        </div>
        </div>
    );
};

export default ConfirmLogoutModal;
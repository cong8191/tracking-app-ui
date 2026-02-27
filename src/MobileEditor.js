import { Button, Col, DatePicker, message, Row, Select } from 'antd';
import axios from './axios-config';
import dayjs from 'dayjs';
import React, { useEffect, useMemo, useState } from 'react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css'; // Theme Snow phổ biến

const MobileEditor = () => {
    const [value, setValue] = useState('');
    const [gameId, setGameId] = useState();
    const [game, setGame] = useState();
    const [selectedDate, setSelectedDate] = useState(dayjs());
    const [eventOptions, setEventOptions] = useState([]);
    const [loading, setLoading] = useState(false);

    const fetcEventData = async () => {
        try {
            const response = await axios.get(`/listGame`);
            setEventOptions(response.data.map((item) => {
                return { 'value': item.id, 'label': item.name }
            }))
        } catch (err) {
            console.error("❌ GET error:", err);
        }
    };

    useEffect(() => {
        fetcEventData();
    }, []);

    // Cấu hình Toolbar rút gọn cho Mobile
    const modules = useMemo(() => ({
        toolbar: {
            container: [
                ['bold', 'italic', 'underline'],
                [{ 'color': [] }],
                ['link'],
                ['paste-btn']
            ],
            handlers: {
                'paste-btn': async function () {
                    const quill = this.quill;
                    try {
                        // 1. Đọc văn bản từ Clipboard
                        const text = await navigator.clipboard.readText();

                        if (text) {
                            // 2. Xóa toàn bộ nội dung hiện tại từ vị trí 0 đến hết
                            quill.deleteText(0, quill.getLength());

                            // 3. Chèn văn bản mới vào vị trí đầu tiên (0)
                            quill.insertText(0, text);

                            // 4. Đặt con trỏ chuột xuống cuối đoạn văn vừa dán
                            quill.setSelection(text.length);
                        }
                    } catch (err) {
                        alert("Vui lòng cho phép quyền truy cập Clipboard trên trình duyệt.");
                    }
                }
               
            }
        }
    }), []);

    const formats = [
        'bold', 'italic', 'underline', 'color', 'link'
    ];

    

    const handleSave = async () => {
        if (!game) {
            message.warning('Vui lòng chọn game');
            return;
        }

        setLoading(true);

        try {
            message.info(`Bắt đầu tạo lưu...`);

            await axios.post(`/updateContent`, {
                gameId: game,
                content: value,
                selectedDate: selectedDate.format("YYYY/MM/DD")
            });

            setLoading(false);
            message.success('Đã lưu thành công!');

        } catch (err) {
            console.error(err);
            message.error('Lỗi tạo lưu' + err.message);
            setLoading(false);
        }

    };

    const getContent = async () => {
        if (!game) {
            message.warning('Vui lòng chọn game');
            return;
        }

        setLoading(true);

        try {
            message.info(`Bắt đầu lấy data...`);

            const res = await axios.post(`/getContent`, {
                gameId: game,
                action: 'GetDataHtml',
                selectedDate: selectedDate.format("YYYY/MM/DD")
            });

            setValue(res.data.data);
            setLoading(false);
            message.success('Đã get thành công!');

        } catch (err) {
            console.error(err);
            message.error('Lỗi lấy data ' + err.message);
            setLoading(false);
        }

    };

    return (
        <div style={styles.container}>
            <div style={styles.header}>
                <h3>Edit</h3>
                <div style={{ display: 'flex', gap: '10px' }}>
                <Button  onClick={getContent} loading={loading}>
                    Get
                </Button>
                <Button type="primary" onClick={handleSave} loading={loading}>
                    Lưu
                </Button>
                </div>

            </div>

            <Row gutter={[16, 16]}>

                {/* Game Select: Mobile chiếm hết (24), Desktop chiếm 1 phần (6) */}
                {!gameId && (
                    <Col xs={24} md={6} lg={5}>
                        <Select
                            showSearch
                            filterOption={(input, option) => {
                                const keyword = input.toLowerCase();
                                const name = option.label?.toLowerCase?.() || '';
                                return name.includes(keyword);
                            }}
                            style={{ width: '100%' }} // Quan trọng: width 100% để ăn theo Col
                            placeholder="Chọn game (bắt buộc)"
                            value={game}
                            options={eventOptions}
                            onChange={value => setGame(value)}
                        />
                    </Col>
                )}

                {/* Date Picker */}
                <Col xs={24} md={5} lg={4}>
                    <DatePicker
                        style={{ width: '100%' }}
                        value={selectedDate}
                        onChange={(date) => setSelectedDate(date)}
                        format="YYYY/MM/DD"
                    />
                </Col>


            </Row>

            <div style={styles.editorWrapper}>
                <ReactQuill
                    theme="snow"
                    value={value}
                    onChange={setValue}
                    modules={modules}
                    formats={formats}
                    placeholder="Nhập nội dung tại đây..."
                    style={styles.quill}
                />
            </div>
        </div>
    );
};


// CSS Inline để tối ưu giao diện mobile
const styles = {

    container: {
        display: 'flex',
        flexDirection: 'column',
        height: '100vh', // Full màn hình điện thoại
        backgroundColor: '#fff',
    },
    header: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '10px 15px',
        borderBottom: '1px solid #ddd',
    },
    saveBtn: {
        padding: '8px 15px',
        backgroundColor: '#007bff',
        color: '#fff',
        border: 'none',
        borderRadius: '5px',
        fontSize: '14px'
    },
    editorWrapper: {
        flex: 1,
        overflowY: 'auto', // Cho phép cuộn nếu nội dung dài
        marginTop: '10px',
        marginBottom: '10px'
    },
    quill: {
        height: 'calc(100% - 42px)', // Trừ đi chiều cao của toolbar Quill
        display: 'flex',
        flexDirection: 'column'
    }
};

export default MobileEditor;
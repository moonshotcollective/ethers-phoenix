import React, { useState } from "react";
import { Form, Input, InputNumber, Button, Modal } from "antd";
import axios from "axios";

export default function CreatePoapEvent({ server, setLoadingEvents }) {
  const [form] = Form.useForm();
  const [isModalVisible, setIsModalVisible] = useState(false);

  const handleCancel = () => {
    setIsModalVisible(false);
    form.resetFields();
  };

  const showModal = () => {
    setIsModalVisible(true);
  };

  const formSubmit = () => {
    console.log("Form: ", form.getFieldsValue());
    axios
      .post(server + "/poap-events", form.getFieldsValue())
      .then(function (response) {
        console.log(response);
        setLoadingEvents(true);
        setIsModalVisible(false);
      })
      .catch(function (error) {
        console.log(error);
      });
  };

  return (
    <>
      <Button type="primary" style={{ marginLeft: 20 }} onClick={showModal}>
        Create
      </Button>
      <Modal
        title="POAP Event"
        visible={isModalVisible}
        okText="Save"
        onOk={formSubmit}
        onCancel={handleCancel}
        destroyOnClose={true}
      >
        <Form form={form} layout="vertical" initialValues={{}} preserve={false}>
          <Form.Item label="EVENT ID" name="id" required tooltip="This is the POAP event id">
            <Input placeholder="event id" />
          </Form.Item>
          <Form.Item label="Name" name="name" required tooltip="POAP name">
            <Input placeholder="name" />
          </Form.Item>
          <Form.Item label="Points" name="points" required tooltip="Regen points assigned to this POAP">
            <InputNumber placeholder="points" step="1" />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}

import React, { useEffect, useState } from "react";
import { Table, Input, InputNumber, Popconfirm, Form, Button, Spin } from "antd";
import { CreatePoapEvent } from "../components";
import axios from "axios";

interface Item {
  id: number;
  name: string;
  points: number;
}

interface EditableCellProps extends React.HTMLAttributes<HTMLElement> {
  editing: boolean;
  dataIndex: string;
  title: any;
  inputType: "number" | "text";
  record: Item;
  index: number;
  children: React.ReactNode;
}

const EditableCell: React.FC<EditableCellProps> = ({
  editing,
  dataIndex,
  title,
  inputType,
  record,
  index,
  children,
  ...restProps
}) => {
  const inputNode = inputType === "number" ? <InputNumber /> : <Input />;

  return (
    <td {...restProps}>
      {editing ? (
        <Form.Item
          name={dataIndex}
          style={{ margin: 0 }}
          rules={[
            {
              required: true,
              message: `Please Input ${title}!`,
            },
          ]}
        >
          {inputNode}
        </Form.Item>
      ) : (
        children
      )}
    </td>
  );
};

function PoapEvents({ DEBUG, server }) {
  const [form] = Form.useForm();
  const [data, setData] = useState([]);
  const [editingKey, setEditingKey] = useState("");
  const [loadingEvents, setLoadingEvents] = useState(true);

  useEffect(() => {
    const updateAllEvents = async () => {
      if (loadingEvents) {
        const events = await axios.get(server + "/poap-events");
        if (DEBUG) console.log("Events: ", events);
        setData(events.data);
        setLoadingEvents(false);
      }
    };
    updateAllEvents();
  }, [DEBUG, server, loadingEvents]);

  const isEditing = (record: Item) => record._id === editingKey;

  const edit = (record: Partial<Item> & { key: React.id }) => {
    form.setFieldsValue({ id: "", name: "", points: "", ...record });
    setEditingKey(record._id);
  };

  const cancel = () => {
    setEditingKey("");
  };

  const deleteEvent = event => {
    axios
      .delete(server + "/poap-events/" + event._id)
      .then(function (response) {
        console.log(response);
        setLoadingEvents(true);
      })
      .catch(function (error) {
        console.log(error);
      });
  };

  const save = async (key: React.Key) => {
    try {
      const row = await form.validateFields();

      const newData = [...data];

      const index = newData.findIndex(item => key === item._id);

      if (index > -1) {
        const item = newData[index];

        axios
          .put(server + "/poap-events/" + key, row)
          .then(function (response) {
            console.log(response);
            newData.splice(index, 1, {
              ...item,
              ...row,
            });
            setData(newData);
            setEditingKey("");
          })
          .catch(function (error) {
            console.log(error);
          });
      }
    } catch (errInfo) {
      console.log("Validate Failed:", errInfo);
    }
  };

  const columns = [
    {
      title: "ID",
      dataIndex: "id",
      editable: true,
    },
    {
      title: "name",
      dataIndex: "name",
      editable: true,
    },
    {
      title: "Points",
      dataIndex: "points",
      editable: true,
    },
    {
      title: "Actions",
      dataIndex: "actions",
      render: (_: any, record: Item) => {
        const editable = isEditing(record);
        return editable ? (
          <span>
            <Button type="primary" onClick={() => save(record._id)} style={{ marginRight: 8 }}>
              Save
            </Button>
            <Popconfirm title="Sure to cancel?" onConfirm={cancel}>
              <Button>Cancel</Button>
            </Popconfirm>
          </span>
        ) : (
          <span>
            <Button type="primary" disabled={editingKey !== ""} onClick={() => edit(record)}>
              Edit
            </Button>
            <Popconfirm title="Are you sure to delete the POAP event?" onConfirm={() => deleteEvent(record)}>
              <Button type="primary" style={{ marginLeft: 20 }}>
                Delete
              </Button>
            </Popconfirm>
          </span>
        );
      },
    },
  ];

  const mergedColumns = columns.map(col => {
    if (!col.editable) {
      return col;
    }
    return {
      ...col,
      onCell: (record: Item) => ({
        record,
        inputType: col.dataIndex === "points" ? "number" : "text",
        dataIndex: col.dataIndex,
        title: col.title,
        editing: isEditing(record),
      }),
    };
  });

  return (
    <div style={{ width: "auto", margin: "auto", paddingBottom: 25, minHeight: 800 }}>
      <h2>
        POAP Events
        <CreatePoapEvent server={server} setLoadingEvents={setLoadingEvents} />
      </h2>
      {loadingEvents ? (
        <Spin style={{ marginTop: 100 }} />
      ) : (
        <Form form={form} component={false}>
          {data.length > 0 ? (
            <Table
              components={{
                body: {
                  cell: EditableCell,
                },
              }}
              bordered
              dataSource={data}
              columns={mergedColumns}
              rowClassName="editable-row"
              pagination={{
                onChange: cancel,
              }}
            />
          ) : (
            <p>No POAP Events</p>
          )}
        </Form>
      )}
    </div>
  );
}

export default PoapEvents;
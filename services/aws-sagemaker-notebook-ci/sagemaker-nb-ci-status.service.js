// https://code.amazon.com/packages/SageMakerMLFExampleNotebooksShieldsIO/trees/mainline
import { DynamoDBClient, GetItemCommand } from '@aws-sdk/client-dynamodb'
import { BaseJsonService } from '../index.js'

const dynamoDB = new DynamoDBClient({ region: 'us-west-2' })

export default class SageMakerNotebookCiStatus extends BaseJsonService {
  static category = 'issue-tracking'
  static route = {
    base: 'sagemaker-nb',
    pattern: ':region/:notebook',
  }

  static examples = []

  static defaultBadgeData = {
    label: 'region | kernel | instance',
    color: 'informational',
  }

  static render({ region, info }) {
    return {
      label: `${region} | ${info.kernel} | ${info.instance}`,
      message: info.status,
      color:
        info.status === 'Completed'
          ? 'green'
          : info.status === 'Failed'
          ? 'red'
          : info.status === 'Stopped'
          ? 'orange'
          : info.status === 'Skipped'
          ? 'yellow'
          : 'lightgray',
    }
  }

  async getDynamoDBItem(params) {
    const command = new GetItemCommand(params)
    try {
      const data = await dynamoDB.send(command)
      console.log(data)
      return {
        instance: data.Item.instance.S,
        kernel: data.Item.kernel.S,
        status: data.Item.status.S,
        status_reason: data.Item.status_reason.S,
      }
    } catch (err) {
      console.error(err)
    }
  }

  async fetch({ region, notebook }) {
    console.log('fetching ', `${notebook}-${region}`)
    const params = {
      TableName: 'badging-test',
      Key: {
        'notebook-region': { S: `${notebook}-${region}` },
      },
    }

    return await this.getDynamoDBItem(params)
  }

  async handle({ region, notebook }) {
    notebook = notebook.replaceAll('|', '/')
    console.log(region, notebook)
    const info = await this.fetch({
      region,
      notebook,
    })
    console.log('info', info)
    return this.constructor.render({
      region,
      info,
    })
  }
}
